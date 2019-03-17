export default class Event {
  static init(bts) {
    this.bts = bts;

    this.connected = new this(bts.connect);
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
        events: [undefined]
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
    await this.bts.db.set_subscribe_callback(this.getUpdate.bind(this), false);
  }

  static async subscribeAccount() {
    if (this.account.newSubs.length == 0) return;

    await this.bts.db.get_full_accounts(this.account.newSubs, true);
    this.account.newSubs = [];
    this.block.unsubscribe(this.bindAccount);

    Object.keys(this.account.map).forEach(async accName => {
      let obj = this.account.map[accName];
      if (!obj.id) {
        obj.id = (await this.bts.accounts[accName]).id;
      }

      if (!obj.history)
        obj.history = (await this.bts.history.get_account_history(
          obj.id,
          "1.11.0",
          1,
          "1.11.0"
        ))[0].id;
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
      let name = (await this.bts.accounts.id(id)).name,
        acc = this.account.map[name];

      if (!acc.history) acc.history = "1.11.0";

      acc.events = await this.bts.history.get_account_history(
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
