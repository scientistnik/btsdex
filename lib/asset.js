export default class Asset {
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
      let obj = (await this.db.list_assets(symbol,1))[0];

      if (!obj || obj.symbol !== symbol)
        return new Error(`Not found asset ${symbol}! Blockchain return ${obj ? obj.symbol : obj}`);

      this.asset[symbol] = new this(obj)
      return this.asset[symbol]
    }
  }

  static async id(id) {
    let asset = Object.keys(this.asset).find(ast => this.asset[ast].id == id)

    if (asset === undefined) {
      asset = (await this.db.get_assets([id]))[0];

      if (asset == null)
        return new Error(`Not found asset by id ${id}!`)

      this.asset[asset.symbol] = new this(asset)
    }

    return this.asset[asset.symbol];
  }

  static async fromParam(param) {
    return {amount: param.amount, asset: await this.id(param.asset_id)}
  }

  static async update() {
    let arr = Object.keys(this.asset).map(asset => this.asset[asset].id)

    let assets = await this.db.get_assets(arr)

    assets.forEach(asset => Object.assign(this.asset[asset.symbol],asset))
  }

  constructor(rpcObj) {
    Object.assign(this, rpcObj)
  }

  toParam(number = 0) {
    return {amount: number, asset_id: this.id}
  }

  fee() {
    return this.options.market_fee_percent / 100 / 100;
  }

  async update() {
    let asset = (await Asset.db.get_assets([this.id]))[0]
    Object.assign(this, asset)
  }
}