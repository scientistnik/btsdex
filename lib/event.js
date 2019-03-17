"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _btsdexApi = require("btsdex-api");

var _account = _interopRequireDefault(require("./account"));

class Event {
  static init(connect) {
    this.connected = new this(connect);
    this.block = new this(this.connected.subscribe, this.subscribeBlock.bind(this));
    this.bindAccount = this.subscribeAccount.bind(this);
    this.account = new this(this.block.subscribe, this.bindAccount); //this.market = new this(this.connected.subscribe.bind(this.connected))
  }

  static connectedNotify() {
    this.connected.init = true;
    if (!this.connected.map.all) this.connected.map.all = {
      subs: new Set([undefined]),
      events: [undefined]
    };else this.connected.map.all.events.push(undefined);
    this.connected.notify();
  }

  static async resubscribe() {
    await this.subscribeBlock();
    this.account.newSubs = Object.keys(this.account.map);
    await this.subscribeAccount();
  }

  static async subscribeBlock() {
    await _btsdexApi.database.setSubscribeCallback(this.getUpdate.bind(this), false);
  }

  static async subscribeAccount() {
    if (this.account.newSubs.length == 0) return;
    await _btsdexApi.database.getFullAccounts(this.account.newSubs, true);
    this.account.newSubs = [];
    this.block.unsubscribe(this.bindAccount);
    Object.keys(this.account.map).forEach(async accName => {
      let obj = this.account.map[accName];

      if (!obj.id) {
        obj.id = (await _account.default[accName]).id;
      }

      if (!obj.history) obj.history = (await _btsdexApi.history.getAccountHistory(obj.id, "1.11.0", 1, "1.11.0"))[0].id;
    });
  }

  static subscribe(event, callback, accName) {
    if (!Event[event]) throw new Error(`Event ${event} not found`);

    if (event == "account") {
      Event[event].subscribe(callback, accName);
    } else Event[event].subscribe(callback);
  }

  static getUpdate(updates) {
    this.block.map.all.events = [];
    let ids = Object.keys(this.account.map).map(accName => this.account.map[accName].id).filter(el => el);
    let updateAcc = new Set();
    updates.forEach(array => array.forEach(obj => {
      if (obj.id) {
        if (obj.id == "2.1.0") this.block.map.all.events.push(obj);else if (/^2\.5\./.test(obj.id) && ids.includes(obj.owner)) updateAcc.add(obj.owner);
      }
    }));
    this.block.notify();
    if (updateAcc.size > 0) this.updateAccounts(updateAcc);
  }

  static async updateAccounts(ids) {
    let updateAcc = new Set();

    for (let id of ids) {
      let name = (await _account.default.id(id)).name,
          acc = this.account.map[name];
      if (!acc.history) acc.history = "1.11.0";
      acc.events = await _btsdexApi.history.getAccountHistory(id, acc.history, 100, "1.11.0");
      acc.history = acc.events[0].id;
      updateAcc.add(name);
    }

    this.account.notify(updateAcc);
  }

  constructor(subFunc, notifyFunc) {
    (0, _defineProperty2.default)(this, "subscribe", async (callback, accName) => {
      accName = accName || "all";
      let handler = this.map[accName];

      if (!handler) {
        this.newSubs.push(accName);
        this.map[accName] = handler = {
          subs: new Set(),
          events: []
        };
        if (this.subFunc) this.subFunc(this.notifyFunc);
      }

      handler.subs.add(callback);
      if (this.init && callback) callback();
    });
    (0, _defineProperty2.default)(this, "unsubscribe", (callback, accName) => {
      accName = accName || "all";
      let handler = this.map[accName];
      if (!handler) throw new Error(`Error when unsubscribe: handler ${accName} not found`);
      handler.subs.delete(callback);
    });
    (0, _defineProperty2.default)(this, "notify", keys => {
      (keys ? keys : Object.keys(this.map)).forEach(accName => {
        let handler = this.map[accName];
        handler.subs.forEach(async sub => {
          if (sub && handler.events.length != 0) sub(handler.events);
        });
      });
    });
    this.init = false;
    this.subFunc = subFunc;
    this.notifyFunc = notifyFunc;
    this.map = {};
    this.newSubs = [];
  }

}

var _default = Event;
exports.default = _default;