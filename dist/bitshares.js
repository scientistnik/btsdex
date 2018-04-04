import { Apis } from "bitsharesjs-ws";
import Event from './event.js';
import Assets from './assets.js';
import Accounts from './accounts.js';
import api from './api.js';
import { TransactionBuilder, PrivateKey } from 'bitsharesjs';
export default class BitShares {
  static init(options) {
    this.node = options.node;
    this.events = {
      connected: new Event()
    };
  }

  static async connect() {
    let res = await Apis.instance(this.node, true).init_promise;
    console.log("connected to:", res[0].network);
    this.db = api(Apis.instance().db_api());
    this.history = api(Apis.instance().history_api());
    this.assets = Assets.init(this.db);
    this.accounts = Accounts.init(this.db);
    this.events.connected.init = true;
    this.events.connected.notify();
  }

  static subscribe(event, callback) {
    this.events[event].subscribe(callback);
  }

  constructor(accountName, activeKey, feeSymbol = 'bts') {
    //this.activeKey = PrivateKey.fromWif(activeKey);
    this.initPromise = Promise.all([BitShares.accounts[accountName], BitShares.assets[feeSymbol]]).then(params => {
      [this.account, this.feeAsset] = params;
    });
  }

  async setFeeAsset(feeSymbol) {
    await this.initPrimise;
    this.feeAsset = await BitShares.assets[feeAsset];
  }

  async sendTransaction(type, operation) {
    let tx = new TransactionBuilder();
    tx.add_type_operation(type, operation);
    await tx.set_required_fees();
    tx.add_signer(this.activeKey, this.activeKey.toPublicKey().toPublicKeyString());
    tx.broadcast();
    return tx;
  }

  async buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;
    buyAsset = await BitShares.assets[buySymbol];
    baseAsset = await BitShares.assets[baseSymbol];
    let buyAmount = Math.floor(amount * 10 ** buyAsset.precision),
        sellAmount = Math.floor(amount * price * 10 ** baseAsset.precision);
    if (buyAmount == 0 || sellAmount == 0) return new Error("Amount equal 0!");
    let operation = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: baseAsset.toParam(sellAmount),
      min_to_receive: buyAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    };
    return this.sendTransaction("limit_order_create", operation);
  }

  async sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;
    sellAsset = await BitShares.assets[sellAsset];
    baseAsset = await BitShares.assets[baseSymbol];
    let sellAmount = Math.floor(amount * 10 ** sellAsset.precision),
        buyAmount = Math.floor(amount * price * 10 ** baseAsset.precision);
    if (buyAmount == 0 || sellAmount == 0) return new Error("Amount equal 0!");
    let operation = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: sellAsset.toParam(sellAmount),
      min_to_receive: baseAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    };
    return this.sendTransaction("limit_order_create", operation);
  }

  async orders() {
    return (await BitShares.db.get_full_accounts([this.account.id], false))[0][1].limit_orders;
  }

  async cancelOrder(id) {
    let operation = {
      fee: this.feeAsset.toParam(),
      fee_paying_account: this.account.id,
      order: id,
      extensions: []
    };
    return this.sendTransaction("limit_order_cancel", operation);
  }

}