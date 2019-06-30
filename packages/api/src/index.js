import { setLogger, debug, warn } from "./logger";
import { addConfig, getConfig } from "./config";
import { APIs, getIdByMethod } from "./apis";
import {
  fetch,
  connect,
  disconnect,
  getStatus,
  setNotifyStatusCallback
} from "./connection";

export {
  addConfig,
  getConfig,
  setLogger,
  connect,
  disconnect,
  getStatus,
  setNotifyStatusCallback
};

const getAPI = name =>
  new Proxy(APIs, {
    get: (_, method) => {
      if (typeof method === "symbol") return _;
      return (...args) => {
        method = method.replace(/([A-Z])/g, $1 => `_${$1.toLowerCase()}`);
        debug(
          `call ${name}.${method}(${args.map(arg => JSON.stringify(arg))})`
        );

        let id = name === "call" ? getIdByMethod(method) : APIs[name].id;
        if (id === undefined) warn(`${name} does not have access to ${method}`);

        return fetch("call", [id, method, args]);
      };
    }
  });

export const database = getAPI("database");
export const history = getAPI("history");
export const crypto = getAPI("crypto");
export const network = getAPI("network");

export const block = getAPI("block");
export const asset = getAPI("asset");
export const orders = getAPI("orders");

export const call = getAPI("call");
