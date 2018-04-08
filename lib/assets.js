export default class Assets{
  static init(db) {
    if (this.instance)
      return this.instance
    
    this.db = db
    this.asset = {}
    this.instance = new Proxy(this,this)
    return this.instance;
  }

  static get(obj,name) {
    if (obj[name])
      return obj[name]

    return this.getAsset(name);
  }

  static async getAsset(_symbol) {
    let symbol = _symbol.toUpperCase();

    if (this.asset[symbol])
      return this.asset[symbol]
    else {
      this.asset[symbol] = new this((await this.db.list_assets(symbol,1))[0])
      return this.asset[symbol]
    }
  }

  static async getAssetById(id) {
    let asset = Object.keys(this.asset).find(ast => ast.id == id)

    if (asset === undefined)
      asset = (await this.db.get_assets([id]))[0];

    return asset;
  }

  static async fromParam(param) {
    return {amount: param.amount, asset: await this.getAssetById(param.asset_id)}
  }

  constructor(rpcObj) {
    Object.keys(rpcObj).forEach(key => this[key] = rpcObj[key])
  }

  toParam(number = 0) {
    return {amount: number, asset_id: this.id}
  }

  fee() {
    return this.options.market_fee_percent / 100 / 100;
  }
}