//import { TransactionBuilder } from "bitsharesjs";
import TransactionBuilder from "./TransactionBuilder";
import { database } from "x4tdex-api";

class Transaction {
  static newTx(keys) {
    var tx = new Transaction(keys);

    return new Proxy(tx, tx);
  }

  constructor(keys) {
    this.tx = new TransactionBuilder();
    this.keys = keys;
  }

  get = (obj, name) => {
    if (obj[name]) return obj[name];

    return params => {
      this.add({ [name]: params });
    };
  };

  add = operations => {
    Object.keys(operations).forEach(key =>
      this.tx.add_type_operation(key, operations[key])
    );
  };

  broadcast = async keys => {
    await this.tx.set_required_fees();
    (keys ? keys : this.keys).forEach(key =>
      this.tx.add_signer(key, key.toPublicKey().toPublicKeyString())
    );
    return this.tx.broadcast();
  };

  cost = async () => {
    await this.tx.set_required_fees();
    let fees = {};
    this.tx.operations.forEach(op => {
      fees[op[1].fee.asset_id] = fees[op[1].fee.asset_id] || 0;
      fees[op[1].fee.asset_id] += +op[1].fee.amount;
    });

    let assets = await database.getAssets(Object.keys(fees));

    //return assets.map(asset => ({asset, amount: fees[asset.id] / 10 ** asset.precision}))
    return assets.reduce((obj, asset) => {
      obj[asset.symbol] = fees[asset.id] / 10 ** asset.precision;
      return obj;
    }, {});
  };
}

export default Transaction;
