import { setLogger, error, debug, info, warn } from "./logger";

const WebSocket = require("isomorphic-ws");

const API_NAMES = [
  "database",
  "history",
  "network_broadcast",
  "crypto",
  "asset",
  "block",
  "orders"
];

const defaultConfig = {
  name: "BitShares",
  coreAsset: "BTS",
  addressPrefix: "BTS",
  expireInSecs: 15,
  expireInSecsProposal: 24 * 60 * 60,
  reviewInSecsCommittee: 24 * 60 * 60,
  chainId: "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8"
};

var ws,
  servers = {
    addresses: [],
    curIndex: 0,
    reconnect: true
  },
  sent = { length: 0 },
  socket = {
    status: null,
    disconn: Promise.resolve()
  },
  apiIDs = {},
  notifyCallback = null,
  networks = [
    {
      ...defaultConfig
    },
    {
      name: "TestNet",
      coreAsset: "TEST",
      addressPrefix: "TEST",
      expireInSecs: 15,
      expireInSecsProposal: 24 * 60 * 60,
      reviewInSecsCommittee: 24 * 60 * 60,
      chainId:
        "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447"
    }
  ],
  currentConfig = null,
  responseTimeout = 5000;

export const addConfig = config =>
  networks.push({ ...defaultConfig, ...config });
export const getConfig = () => currentConfig;
export const getStatus = () => socket.status;

export const connect = (
  _servers = servers.addresses,
  timeout = responseTimeout,
  reconnect = true
) =>
  (socket.conn =
    ws && socket.conn
      ? socket.conn
      : new Promise((resolve, reject) => {
          debug("call connect");

          servers.addresses = _servers instanceof Array ? _servers : [_servers];
          servers.reconnect = reconnect;

          responseTimeout = timeout;
          try {
            ws = new WebSocket(servers.addresses[servers.curIndex]);

            ws.onopen = onOpen(resolve);
            ws.onclose = onClose(reject);
            ws.onmessage = onMessage;
            ws.onerror = onError(reject);
          } catch (err) {
            error(err);
            reject(err);
            ws = null;
          }
        }));

export const disconnect = () =>
  (socket.disconn =
    socket.disconn ||
    new Promise((resolve, reject) => {
      debug("call disconnect", socket);

      servers.reconnect = false;
      if (ws) {
        ws.onclose = onClose(resolve);
        ws.onerror = onError(reject);

        ws.close();
      } else resolve();
    }));

const onOpen = resolve => async () => {
  socket.status = "open";
  debug("onOpen");

  notifyCallback && notifyCallback(socket.status);

  try {
    if (!(await rpc.fetch("call", [1, "login", ["", ""]])))
      throw new Error("Login error");

    let ids = await Promise.all(
      API_NAMES.map(name =>
        rpc.fetch("call", [1, name, []]).catch(err => warn(`${name} API error`))
      )
    );

    API_NAMES.forEach(
      (name, index) => (apiIDs[name.split("_")[0]] = ids[index])
    );

    let chainId = await database.getChainId();
    let config = networks.find(net => net.chainId === chainId);
    if (!config)
      throw new Error(`Unknown chain id (this may be a testnet): ${chainId}`);

    info(`Connected to ${servers.addresses[servers.curIndex]}`);

    currentConfig = config;

    socket.disconn = null;
    resolve(currentConfig);
  } catch (err) {
    error(err);

    ws.close();
  }
};

const onClose = reject => () => {
  socket.status = "close";
  socket.conn = null;
  socket.disconn = socket.disconn || Promise.resolve();
  debug("onClose", servers.reconnect);

  servers.curIndex =
    servers.curIndex + 1 === servers.addresses.length
      ? 0
      : servers.curIndex + 1;

  sent = { length: 0 };

  if (!(notifyCallback && notifyCallback(socket.status)) && servers.reconnect)
    setTimeout(connect, 10000);
  else reject();
};

const onMessage = data => {
  let message = JSON.parse(data.data);

  try {
    if (message.method === "notice" && sent[message.params[0]].notice)
      sent[message.params[0]].notice(message.params[1]);

    if (message.id !== undefined && sent[message.id]) {
      message.error
        ? sent[message.id].reject(message.error)
        : sent[message.id].resolve(message.result);

      if (!sent[message.id].notice) delete sent[message.id];
    }
  } catch (err) {
    error(err);
  }
};

const onError = reject => err => {
  socket.status = "error";
  notifyCallback && notifyCallback(socket.status);
  error("error");

  socket.conn = socket.disconn = null;
  reject(err);
};

const rpc = {
  send: (id, method, params) => {
    let obj = {
      id,
      jsonrpc: "2.0",
      method,
      params
    };

    return ws.send(JSON.stringify(obj));
  },
  fetch: (method, params) =>
    new Promise((resolve, reject) => {
      let timeout = setTimeout(() => reject("timeout"), responseTimeout);
      let callbacks = {
        resolve: response => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject
      };

      if (
        [
          "set_subscribe_callback",
          "set_pending_transaction_callback",
          "subscribe_to_market",
          "set_block_applied_callback",
          "broadcast_transaction_with_callback"
        ].includes(params[1])
      ) {
        callbacks.notice = params[2][0];
        params[2][0] = sent.length;
      }

      rpc.send(sent.length, method, params);
      sent[sent.length++] = callbacks;
    })
};

const selectAPI = method => {
  if (["get_grouped_limit_orders"].includes(method)) return apiIDs.orders;
  else if (["get_asset_holders", "get_all_asset_holders"].includes(method))
    return apiIDs.asset;
  else if (["get_blocks"].includes(method)) return apiIDs.block;
  else if (
    [
      "blind",
      "blind_sum",
      "range_get_info",
      "range_proof_sign",
      "verify_sum",
      "verify_range",
      "verify_range_proof_rewind"
    ].includes(method)
  )
    return apiIDs.crypto;
  else if (
    [
      "get_account_history",
      "get_account_history_operations",
      "get_relative_account_history",
      "get_fill_order_history",
      "get_market_history",
      "get_market_history_buckets"
    ].includes(method)
  )
    return apiIDs.history;

  return apiIDs.database;
};

const getAPI = name =>
  new Proxy(apiIDs, {
    get: (_, method) => {
      if (typeof method === "symbol") return _;
      return (...args) => {
        method = method.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
        debug(
          `call ${name}.${method}(${args.map(arg => JSON.stringify(arg))})`
        );

        let id = name === "call" ? selectAPI(method) : apiIDs[name];
        if (id === undefined) warn(`${name} does not have access to ${method}`);

        return rpc.fetch("call", [id, method, args]);
      };
    }
  });

export const setNotifyStatusCallback = callback => (notifyCallback = callback);

export const database = getAPI("database");
export const history = getAPI("history");
export const crypto = getAPI("crypto");
export const network = getAPI("network");

export const block = getAPI("block");
export const asset = getAPI("asset");
export const orders = getAPI("orders");

export const call = getAPI("call");

export { setLogger };

export default {
  addConfig,
  getConfig,
  getStatus,
  setLogger,
  connect,
  disconnect,
  setNotifyStatusCallback,
  database,
  history,
  crypto,
  network,
  block,
  asset,
  orders,
  call
};
