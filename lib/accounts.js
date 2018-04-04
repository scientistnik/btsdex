export default class Accounts{
  static init(db) {
    if (Accounts.instance)
      return Accounts.instance

    Accounts.db = db
    Accounts.asset = {}
    Accounts.instance = new Proxy(Accounts,Accounts)
    return Accounts.instance;
  }

  static async get(obj,name) {
    if (obj.asset[name])
      return obj.asset[name]
    else {
      obj.asset[name] = new Accounts((await Accounts.db.get_account_by_name(name)))
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