export default class Assets{
  static init(db) {
    if (Assets.instance)
      return Assets.instance
    
    Assets.db = db
    Assets.asset = {}
    Assets.instance = new Proxy(Assets,Assets)
    return Assets.instance;
  }

  static async get(obj,_name) {
    let name = _name.toUpperCase();

    if (obj.asset[name])
      return obj.asset[name]
    else {
      obj.asset[name] = new Assets((await Assets.db.list_assets(name,1))[0])
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