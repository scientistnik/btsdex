import {Apis} from "bitsharesjs-ws";
import Event from "./event.js"
import Assets from "./assets.js"
import Accounts from "./accounts.js"
import api from "./api.js"
import {TransactionBuilder, TransactionHelper, PrivateKey, Login, Aes} from "bitsharesjs"

export default class BitShares {
  static init(node = "wss://bitshares.openledger.info/ws", autoconnect = false) {
    this.node = node;
    this.events = {
      connected: new Event()
    }

    if (autoconnect)
      this.connect()
  }

  static async connect() {
    if (this.events.connected.init)
      return

    let res = await Apis.instance(this.node, true).init_promise
    console.log("connected to:", res[0].network);

    this.db = api(Apis.instance().db_api());
    this.history = api(Apis.instance().history_api());
    this.network = api(Apis.instance().network_api());
    //this.crypto = api(Apis.instance().crypto_api());

    this.assets = Assets.init(this.db);
    this.accounts = Accounts.init(this.db);

    this.events.connected.init = true;
    this.events.connected.notify();
  }

  static subscribe(event,callback) {
    this.events[event].subscribe(callback)
  }

  static generateKeys(name, password, arrKeysName) {
    return Login.generateKeys(name, password, arrKeysName);
  }

  static async ticker(baseSymbol, quoteSymbol) {
    return BitShares.db.get_ticker(baseSymbol,quoteSymbol)
  }

  static async tradeHistory(quoteSymbol, baseSymbol, startDate, stopDate, bucketSeconds) {
    return BitShares.db.get_market_history(quoteSymbol, baseSymbol, bucketSeconds, startDate.toISOString().slice(0, -5), stopDate.toISOString().slice(0, -5))
  }

  constructor(accountName, activeKey, feeSymbol = 'bts') {
    this.activeKey = PrivateKey.fromWif(activeKey);

    this.initPromise = Promise.all([
      BitShares.accounts[accountName],
      BitShares.assets[feeSymbol]
    ]).then(params => {
      [this.account, this.feeAsset] = params;
    })
  }

  async setFeeAsset(feeSymbol) {
    await this.initPromise;
    this.feeAsset = await BitShares.assets[feeAsset]
  }

  setMemoKey(memoKey) {
    this.memoKey = PrivateKey.fromWif(memoKey);
  }

  async sendTransaction(type, operation) {
    let tx = new TransactionBuilder();
    tx.add_type_operation(type,operation)
    await tx.set_required_fees()
    tx.add_signer(this.activeKey, this.activeKey.toPublicKey().toPublicKeyString());
    return tx.broadcast();
  }

  async balances() {
    await this.initPromise;

    let balances = await BitShares.db.get_account_balances(this.account.id,[]);
    return Promise.all(balances.map(balance => BitShares.assets.fromParam(balance)))
  }

  async buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;

    let buyAsset = await BitShares.assets[buySymbol],
        baseAsset = await BitShares.assets[baseSymbol],
        buyAmount = Math.floor(amount * 10 ** buyAsset.precision),
        sellAmount = Math.floor(amount * price * 10 ** baseAsset.precision);

    if (buyAmount == 0 || sellAmount == 0)
      return new Error("Amount equal 0!")

    let operation = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: baseAsset.toParam(sellAmount),
      min_to_receive: buyAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    }

    let tx = await this.sendTransaction("limit_order_create",operation);
    return (await BitShares.db.get_objects([tx[0].trx.operation_results[0][1]]))[0];
  }

  async sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;

    let sellAsset = await BitShares.assets[sellSymbol],
        baseAsset = await BitShares.assets[baseSymbol],
        sellAmount = Math.floor(amount * 10 ** sellAsset.precision),
        buyAmount = Math.floor(amount * price * 10 ** baseAsset.precision);

    if (buyAmount == 0 || sellAmount == 0)
      return new Error("Amount equal 0!")

    let operation = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: sellAsset.toParam(sellAmount),
      min_to_receive: baseAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    }

    let tx = await this.sendTransaction("limit_order_create",operation);
    return (await BitShares.db.get_objects([tx[0].trx.operation_results[0][1]]))[0];
  }

  async orders() {
    await this.initPromise;
    return (await BitShares.db.get_full_accounts([this.account.id],false))[0][1].limit_orders
  }

  async getOrder(id) {
    await this.initPromise;
    return (await BitShares.db.get_objects([id]))[0];
  }

  async cancelOrder(id) {

    let operation = {
      fee: this.feeAsset.toParam(),
      fee_paying_account: this.account.id,
      order: id,
      extensions: []
    }

    return this.sendTransaction("limit_order_cancel",operation);
  }

  async memo(toName, message) {
    if (!this.memoKey)
      return new Error("Not set memoKey!");

    let nonce = TransactionHelper.unique_nonce_uint64(),
        to = (await BitShares.accounts[toName]).options.memo_key;

    return {
      from: this.memoKey.toPublicKey().toPublicKeyString(),
      to,
      nonce,
      message: Aes.encrypt_with_checksum(this.memoKey, to, nonce, message)
    }
  }

  async transfer(toName, assetSymbol, amount, memo) {
    await this.initPromise;

    let asset = await BitShares.assets[assetSymbol],
        intAmount = Math.floor(amount * 10 ** asset.precision);

    if (intAmount == 0)
      return new Error("Amount equal 0!")

    let operation = {
      fee: this.feeAsset.toParam(),
      from: this.account.id,
      to: (await BitShares.accounts[toName]).id,
      amount: asset.toParam(intAmount),
      extensions: []
    };

    if (memo)
      operation.memo = (typeof memo == "string") ? (await this.memo(toName, memo)) : memo;

    return this.sendTransaction("transfer",operation);
  }

}
