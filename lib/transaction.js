"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _bitsharesjs = require("bitsharesjs");

class Transaction {
  static newTx(keys) {
    var tx = new Transaction(keys);
    return new Proxy(tx, tx);
  }

  static setDB(db) {
    Transaction.db = db;
  }

  constructor(_keys) {
    (0, _defineProperty2.default)(this, "get", (obj, name) => {
      if (obj[name]) return obj[name];
      return params => {
        this.add({
          [name]: params
        });
      };
    });
    (0, _defineProperty2.default)(this, "add", operations => {
      Object.keys(operations).forEach(key => this.tx.add_type_operation(key, operations[key]));
    });
    (0, _defineProperty2.default)(this, "broadcast", async keys => {
      await this.tx.set_required_fees();
      (keys ? keys : this.keys).forEach(key => this.tx.add_signer(key, key.toPublicKey().toPublicKeyString()));
      return this.tx.broadcast();
    });
    (0, _defineProperty2.default)(this, "cost", async () => {
      await this.tx.set_required_fees();
      let fees = {};
      this.tx.operations.forEach(op => {
        fees[op[1].fee.asset_id] = fees[op[1].fee.asset_id] || 0;
        fees[op[1].fee.asset_id] += +op[1].fee.amount;
      });
      let assets = await Transaction.db.get_assets(Object.keys(fees)); //return assets.map(asset => ({asset, amount: fees[asset.id] / 10 ** asset.precision}))

      return assets.reduce((obj, asset) => {
        obj[asset.symbol] = fees[asset.id] / 10 ** asset.precision;
        return obj;
      }, {});
    });
    this.tx = new _bitsharesjs.TransactionBuilder();
    this.keys = _keys;
  }

}

var _default = Transaction;
exports.default = _default;