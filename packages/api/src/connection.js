import { error, debug, info, warn } from "./logger";
import { setConfig, getConfig } from "./config";
import { APIs, METHODS_WITH_CALLBACK, setAPIId } from "./apis";
import { setServers, getServers, nextServer, currServer } from "./servers";

const WebSocket = require("isomorphic-ws");

var ws,
  sent = { length: 0 },
  conn = { promise: null, resolve: null, reject: null, result: false },
  disconn = {
    promise: Promise.resolve(),
    resolve: null,
    reject: null,
    result: true
  },
  notifyCallback = () => false,
  responseTimeout = 5000,
  reconnectTimeout = false;

export const getStatus = () => {
  if (!ws) return "closed";

  return ["connecting", "open", "closing", "closed"][ws.readyState];
};

export const setNotifyStatusCallback = callback => (notifyCallback = callback);

export const connect = (
  servers = getServers(),
  timeout = responseTimeout,
  reconnect = reconnectTimeout
) => {
  setServers(servers);
  reconnectTimeout = reconnect;
  responseTimeout = timeout;

  return (conn.promise =
    ws &&
    (conn.result === null ||
      (conn.result === true && (reconnectTimeout || getStatus() === "open")))
      ? conn.promise
      : new Promise((resolve, reject) => {
          debug("call connect");

          const clearAfter = (method, result) => (...args) => {
            method(...args);
            conn.result = result;
          };

          conn.result = null;
          conn.resolve = clearAfter(resolve, true);
          conn.reject = clearAfter(reject, false);

          try {
            connectSocket();
          } catch (err) {
            error(err);
            reject(err);
            ws = null;
          }
        }));
};

const connectSocket = () => {
  let server = nextServer();

  ws = new WebSocket(server);

  ws.onopen = onOpen;
  ws.onclose = onClose;
  ws.onmessage = onMessage;
  ws.onerror = onError;
};

export const disconnect = () =>
  (disconn.promise =
    disconn.result === null ||
    (disconn.result === true && getStatus() !== "close")
      ? disconn.promise
      : new Promise((resolve, reject) => {
          debug("call disconnect");

          reconnectTimeout = null;
          if (ws) {
            const clearAfter = (method, result) => (...args) => {
              method(...args);
              disconn.result = result;
            };

            disconn.result = null;
            disconn.resolve = clearAfter(resolve, true);
            disconn.reject = clearAfter(reject, false);

            ws.close();
          } else resolve();
        }));

const onOpen = async () => {
  debug("onOpen");
  notifyCallback(getStatus());

  try {
    if (!(await fetch("call", [1, "login", ["", ""]]).catch(() => false)))
      throw new Error("Login error");

    await Promise.all(
      Object.entries(APIs).map(([key, { name }]) =>
        fetch("call", [1, name, []])
          .then(id => setAPIId(key, id))
          .catch(() => warn(`${name} API error`))
      )
    );

    let chainId = await fetch("call", [APIs.database.id, "get_chain_id", []]);

    if (!setConfig(chainId))
      throw new Error(`Unknown chain id (this may be a testnet): ${chainId}`);

    info(`Connected to ${currServer()}`);

    conn.resolve(getConfig());
  } catch (err) {
    error(err);

    ws.close();
  }
};

const onClose = () => {
  debug("onClose", reconnectTimeout);

  sent = { length: 0 };

  if (!notifyCallback(getStatus()) && reconnectTimeout)
    setTimeout(connectSocket, reconnectTimeout);
  else {
    conn.result === null && conn.reject();
    disconn.result === null && disconn.resolve();
  }
};

const onMessage = ({ data }) => {
  try {
    let { id, method, params, result, error } = JSON.parse(data);

    if (method === "notice" && sent[params[0]].notice)
      sent[params[0]].notice(params[1]);

    if (id !== undefined && sent[id]) {
      error ? sent[id].reject(error) : sent[id].resolve(result);

      if (!sent[id].notice) delete sent[id];
    }
  } catch (err) {
    error(err);
  }
};

const onError = err => {
  notifyCallback(getStatus());
  error("error");

  conn.result === null && conn.reject(err);
  disconn.result === null && disconn.reject(err);
};

export const fetch = (method, params) =>
  new Promise((resolve, reject) => {
    let timeout = setTimeout(() => reject("timeout"), responseTimeout);
    let callbacks = {
      resolve: response => {
        clearTimeout(timeout);
        resolve(response);
      },
      reject
    };

    if (METHODS_WITH_CALLBACK.includes(params[1])) {
      callbacks.notice = params[2][0];
      params[2][0] = sent.length;
    }

    ws.send(
      JSON.stringify({
        id: sent.length,
        jsonrpc: "2.0",
        method,
        params
      })
    );
    sent[sent.length++] = callbacks;
  });
