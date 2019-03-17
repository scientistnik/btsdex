"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _bitsharesjsWs = require("bitsharesjs-ws");

class Api {
  static new(api) {
    return new Proxy(_bitsharesjsWs.Apis, new Api(api));
  }

  static getApis() {
    return _bitsharesjsWs.Apis;
  }

  constructor(api) {
    this.api = api;
  }

  get(apis, name) {
    let api = this.api;
    return function () {
      //console.log(`api call: ${name}(${[...arguments]})`)
      return apis.instance()[api]().exec(name, [...arguments]);
    };
  }

}

exports.default = Api;