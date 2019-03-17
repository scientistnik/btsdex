"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class Asset {
  static init(db) {
    if (this.instance) return this.instance;
    this.db = db;
    this.map = {};
    this.instance = new Proxy(this, this);
    return this.instance;
  }

  static get(obj, name) {
    if (obj[name]) return obj[name];
    return /^1\.3\.\d+$/.test(name) || !isNaN(name) ? this.id(name) : this.getAsset(name);
  }

  static async getAsset(_symbol) {
    let symbol = _symbol.toUpperCase();

    if (this.map[symbol]) return this.map[symbol];
    let obj = (await this.db.list_assets(symbol, 1))[0];
    if (!obj || obj.symbol !== symbol) throw new Error(`Not found asset ${symbol}! Blockchain return ${obj ? obj.symbol : obj}`);
    this.map[symbol] = new this(obj);
    return this.map[symbol];
  }

  static async id(id) {
    if (!isNaN(id)) id = `1.3.${id}`;
    let asset = Object.keys(this.map).find(symbol => this.map[symbol].id == id);
    if (asset) return this.map[asset];
    asset = (await this.db.get_assets([id]))[0];
    if (!asset) throw new Error(`Not found asset by id ${id}!`);
    this.map[asset.symbol] = new this(asset);
    return this.map[asset.symbol];
  }

  static async fromParam(param) {
    return {
      amount: param.amount,
      asset: await this.id(param.asset_id)
    };
  }

  static async update() {
    let assets = await this.db.get_assets(Object.keys(this.map).map(symbol => this.map[symbol].id));
    assets.forEach(asset => Object.assign(this.map[asset.symbol], asset));
  }

  constructor(rpcObj) {
    Object.assign(this, rpcObj);
  }

  toParam(number = 0) {
    return {
      amount: number,
      asset_id: this.id
    };
  }

  fee() {
    return this.options.market_fee_percent / 100 / 100;
  }

  async update() {
    Object.assign(this, (await Asset.db.get_assets([this.id]))[0]);
  }

}

exports.default = Asset;