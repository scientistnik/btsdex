import Event from "./event.js"
import Asset from "./asset.js"
import Account from "./account.js"
import Api from "./api.js"
import Fees from "./fees.js"
import {TransactionBuilder, TransactionHelper, PrivateKey, Login, Aes, ChainStore} from "bitsharesjs"

export default class BitShares {
  static init(node = "wss://bitshares.openledger.info/ws", autoconnect = false) {
    this.node = node;
    this.events = Event.init(this)

    if (autoconnect)
      return this.connect()
  }

  static async connect() {
    if (this.connectPromise || this.connectedPromise)
      return Promise.all([this.connectPromise, this.connectedPromise]);

    await (this.connectPromise = this.reconnect());
    await (this.connectedPromise = this.connectedInit());

    this.store = ChainStore;

    this.events.connectedNotify()

    return true;
  }

  static async reconnect() {
    let res = await Api.getApis().instance(this.node, true).init_promise;
    console.log("connected to:", res[0].network);

    return res;
  }

  static async connectedInit() {
    if (!this.connectPromise || this.blockReCall)
      return

    this.blockReCall = true

    this.db = Api.new('db_api');
    this.history = Api.new('history_api');
    this.network = Api.new('network_api');
    //this.crypto = Api.new('crypto_api');

    this.assets = Asset.init(this.db);
    this.accounts = Account.init(this.db);
    this.fees = Fees.init(this.db);
    await this.fees.update();
  }

  static subscribe() {
    this.events.subscribe(...arguments)
  }

  static async login(accountName, password, memoEqualActive = false, feeSymbol = 'bts') {
    let 
      activeKey = PrivateKey.fromSeed(`${accountName}active${password}`),
      memoKey = memoEqualActive ? activeKey : PrivateKey.fromSeed(`${accountName}memo${password}`),
      pubActiveKey = (await this.accounts[accountName]).active.key_auths[0][0];

    if (activeKey.toPublicKey().toString() != pubActiveKey)
      throw new Error("The pair of login and password do not match!")

    let account = new this(accountName, activeKey.toWif(), feeSymbol);
    account.setMemoKey(memoKey.toWif())

    return account
  }

  static generateKeys(name, password, arrKeysName) {
    return Login.generateKeys(name, password, arrKeysName);
  }

  static async ticker(baseSymbol, quoteSymbol) {
    return BitShares.db.get_ticker(baseSymbol.toUpperCase(), quoteSymbol.toUpperCase())
  }

  static async tradeHistory(quoteSymbol, baseSymbol, startDate, stopDate, bucketSeconds) {
    return BitShares.history.get_market_history(
      (await BitShares.assets[quoteSymbol]).id,
      (await BitShares.assets[baseSymbol]).id,
      bucketSeconds,
      startDate.toISOString().slice(0, -5),
      stopDate.toISOString().slice(0, -5)
    )
  }

  constructor(accountName, activeKey, feeSymbol = 'bts') {
    if (activeKey)
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
    this.feeAsset = await BitShares.assets[feeSymbol]
  }

  setMemoKey(memoKey) {
    this.memoKey = PrivateKey.fromWif(memoKey);
  }

  async sendTransaction(type, operation) {
    let tx = new TransactionBuilder();
    tx.add_type_operation(type, operation)
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
      throw new Error("Amount equal 0!")

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
      throw new Error("Amount equal 0!")

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
    await this.initPromise;

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
      throw new Error("Not set memoKey!");

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
      throw new Error("Amount equal 0!")

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
