import { database, history } from "btsdex-api";
import Account from "./account";

class Event {
  static init(connect) {
    this.connected = new this(connect);
    this.block = new this(
      this.connected.subscribe,
      this.subscribeBlock.bind(this)
    );
    this.bindAccount = this.subscribeAccount.bind(this);
    this.account = new this(this.block.subscribe, this.bindAccount);
    //this.market = new this(this.connected.subscribe.bind(this.connected))
  }

  static connectedNotify() {
    this.connected.init = true;
    if (!this.connected.map.all)
      this.connected.map.all = {
        subs: new Set([undefined]),
        events: [undefined],
      };
    else this.connected.map.all.events.push(undefined);
    this.connected.notify();
  }

  static async resubscribe() {
    await this.subscribeBlock();

    this.account.newSubs = Object.keys(this.account.map);
    await this.subscribeAccount();
  }

  static async subscribeBlock() {
    await database.setSubscribeCallback(this.getUpdate.bind(this), false);
    await database.getObjects(["2.1.0"]);
  }

  static async subscribeAccount() {
    if (this.account.newSubs.length == 0) return;

    await database.getFullAccounts(this.account.newSubs, true);
    this.account.newSubs = [];
    this.block.unsubscribe(this.bindAccount);

    Object.keys(this.account.map).forEach(async accName => {
      let obj = this.account.map[accName];
      if (!obj.id) {
        obj.id = (await Account[accName]).id;
      }

      if (!obj.history)
        obj.history = (
          await history.getAccountHistory(obj.id, "1.11.0", 1, "1.11.0")
        )[0].id;
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
    let ids = Object.keys(this.account.map)
      .map(accName => this.account.map[accName].id)
      .filter(el => el);
    let updateAcc = new Set();

    updates.forEach(array =>
      array.forEach(obj => {
        if (obj.id) {
          if (obj.id == "2.1.0") this.block.map.all.events.push(obj);
          else if (/^2\.5\./.test(obj.id) && ids.includes(obj.owner))
            updateAcc.add(obj.owner);
        }
      })
    );

    this.block.notify();

    if (updateAcc.size > 0) this.updateAccounts(updateAcc);
  }

  static async updateAccounts(ids) {
    let updateAcc = new Set();

    for (let id of ids) {
      let name = (await Account.id(id)).name,
        acc = this.account.map[name];

      if (!acc.history) acc.history = "1.11.0";

      acc.events = await history.getAccountHistory(
        id,
        acc.history,
        100,
        "1.11.0"
      );
      acc.history = acc.events[0].id;
      updateAcc.add(name);
    }

    this.account.notify(updateAcc);
  }

  constructor(subFunc, notifyFunc) {
    this.init = false;
    this.subFunc = subFunc;
    this.notifyFunc = notifyFunc;
    this.map = {};
    this.newSubs = [];
  }

  subscribe = async (callback, accName) => {
    accName = accName || "all";
    let handler = this.map[accName];

    if (!handler) {
      this.newSubs.push(accName);
      this.map[accName] = handler = { subs: new Set(), events: [] };

      if (this.subFunc) this.subFunc(this.notifyFunc);
    }

    handler.subs.add(callback);

    if (this.init && callback) callback();
  };

  unsubscribe = (callback, accName) => {
    accName = accName || "all";
    let handler = this.map[accName];

    if (!handler)
      throw new Error(`Error when unsubscribe: handler ${accName} not found`);

    handler.subs.delete(callback);
  };

  notify = keys => {
    (keys ? keys : Object.keys(this.map)).forEach(accName => {
      let handler = this.map[accName];

      handler.subs.forEach(async sub => {
        if (sub && handler.events.length != 0) sub(handler.events);
      });
    });
  };
}

export default Event;
