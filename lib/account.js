"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _btsdexApi = require("btsdex-api");

class Account {
  static async getAccout(_name) {
    let name = _name.toLowerCase();

    if (this.map[name]) return this.map[name];
    let acc = await _btsdexApi.database.getAccountByName(name);
    if (!acc || acc.name !== name) throw new Error(`Not found account ${name}! Blockchain return ${acc ? acc.name : acc}`);
    this.map[name] = new this(acc);
    return this.map[name];
  }

  static async id(id) {
    if (!isNaN(id)) id = `1.2.${id}`;
    let name = Object.keys(this.map).find(name => this.map[name].id == id);
    if (name) return this.map[name];
    let acc = (await _btsdexApi.database.getAccounts([id]))[0];
    if (!acc) throw new Error(`Not found account by id ${id}!`);
    this.map[acc.name] = new this(acc);
    return this.map[acc.name];
  }

  static async update() {
    let allData = await _btsdexApi.database.getAccounts(Object.keys(this.map).map(name => this.map[name].id));
    allData.forEach(rpcData => Object.assign(this.map[rpcData.name], rpcData));
  }

  constructor(rpcObj) {
    Object.assign(this, rpcObj);
  }

  async update() {
    Object.assign(this, (await _btsdexApi.database.getAccounts([id]))[0]);
  }

}

(0, _defineProperty2.default)(Account, "map", {});

var _default = new Proxy(Account, {
  get(obj, name) {
    if (obj[name]) return obj[name];
    return /^1\.2\.\d+$/.test(name) || !isNaN(name) ? obj.id(name) : obj.getAccout(name);
  }

});

exports.default = _default;