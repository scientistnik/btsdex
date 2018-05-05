export default class Event {
  static init(bts) {
    this.bts = bts;

    this.connected = new this(bts.connect.bind(bts));
    this.block = new this(this.connected.subscribe.bind(this.connected), this.subscribeBlock.bind(this))
    this.bindAccount = this.subscribeAccount.bind(this)
    this.account = new this(this.block.subscribe.bind(this.block), this.bindAccount)
    //this.market = new this(this.connected.subscribe.bind(this.connected))

    return this
  }

  static async subscribeBlock() {
    await this.bts.db.set_subscribe_callback(this.getUpdate.bind(this),false)
  }

  static async subscribeAccount() {
    await Promise.all(this.account.newSubs.map(subs => this.bts.db.get_full_accounts(subs,true)))
    this.account.newSubs = []
    this.block.unsubscribe(this.bindAccount)
    this.block.su
  }

  static subscribe(event, callback, accounts) {
    if (!this[event])
      throw new Error(`Event ${event} not found`)

    if (event == 'account') {
      this[event].subscribe(callback, accounts)
    }
    else
      this[event].subscribe(callback)
  }

  static getUpdate() {
    // check id
    this.block.map[0].events = arguments
    this.block.notify()

    this.account.map[0].events = arguments
    this.account.notify()
  }

  constructor(subFunc, notifyFunc) {
    this.init = false
    this.subFunc = subFunc
    this.notifyFunc = notifyFunc
    this.map = []
    this.newSubs = []
  }

  async subscribe(callback, ids) {
    ids = ids || 'all';
    let handler = this.map.find(hand => hand.ids === ids);

    if (!handler) {
      this.newSubs.push(ids);
      handler = this.map[this.map.push({ids, subs: new Set(), events:[]}) - 1];

      if (this.subFunc)
        this.subFunc(this.notifyFunc)
    }

    handler.subs.add(callback)

    if (this.init && callback)
      callback()
  }

  unsubscribe(callback, ids) {
    ids = ids || 'all';
    let handler = this.map.find(hand => hand.ids === ids);

    if (!handler)
      throw new Error(`Error when unsubscribe: handler ${ids} not found`)
    
    handler.subs.delete(callback)
  }

  async notify() {
    this.map.forEach(hand => {
      hand.subs.forEach(sub => {
        if (sub && (hand.events.length !=0))
          sub(hand.events)
      })
    })
  }
}