export default class Event {
  static init(connectFunc) {

    this.connected = new this(connectFunc)
    this.block = new this(this.connected.subscribe.bind(this.connected),this.initBlock.bind(this))
    this.account = new this(this.connected.subscribe.bind(this.connected))
    //this.market = new this(this.connected.subscribe.bind(this.connected))

    return this
  }

  static setDb(db) {
    this.db = db
  }

  static async initBlock() {
    await this.db.set_subscribe_callback(this.getUpdate.bind(this),false)
  }

  static getUpdate() {
    // check id
    this.block.notify(...arguments)
  }

  constructor(subFunc, notifyFunc) {
    this.init = false
    this.subFunc = subFunc
    this.notifyFunc = notifyFunc
    this.subs = new Set()
  }

  async subscribe(callback) {
    if (this.subs.size == 0 && this.subFunc)
      await this.subFunc(this.notifyFunc)

    this.subs.add(callback)

    if (this.init && callback)
      callback()
  }

  unsubscribe(callback) {
    this.subs.delete(callback)
  }

  async notify() {
    this.subs.forEach(sub => sub ? sub(...arguments) : null)
  }
}