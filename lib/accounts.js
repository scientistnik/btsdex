export default class Accounts{
  static init(db) {
    if (this.instance)
      return this.instance

    this.db = db
    this.asset = {}
    this.instance = new Proxy(this,this)
    return this.instance;
  }

  static async get(obj,name) {
    if (obj.asset[name])
      return obj.asset[name]
    else {
      let acc = await this.db.get_account_by_name(name);

      if (acc.name !== name)
        return new Error("Don't find account!");

      obj.asset[name] = new this(acc)
      return obj.asset[name]
    }
  }

  constructor(rpcObj) {
    Object.keys(rpcObj).forEach(key => this[key] = rpcObj[key])
  }

  toParam(number = 0) {
    return {amount: number, asset_id: this.id}
  }
}