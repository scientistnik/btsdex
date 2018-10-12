import Event from "./event.js"
import Asset from "./asset.js"
import Account from "./account.js"
import Api from "./api.js"
import Fees from "./fees.js"
import Transaction from "./transaction.js"
import { LZMA as lzma } from "lzma/src/lzma-d-min"
import BigNumber from "bignumber.js"
import {
  TransactionBuilder,
  //TransactionHelper,
  PrivateKey,
  PublicKey,
  Login,
  Aes,
  ChainStore
} from "bitsharesjs"

export default class BitShares {
  static init(node = "wss://bitshares.openledger.info/ws", autoconnect = false, autoreconnect = true) {
    this.node = node;
    this.events = Event.init(this)
    this.autoreconnect = autoreconnect

    if (autoconnect)
      return this.connect()
  }

  static async connect() {
    if (this.connectPromise || this.connectedPromise)
      return Promise.all([this.connectPromise, this.connectedPromise]);

    if (this.autoreconnect)
      Api.getApis().setRpcConnectionStatusCallback(this.statusCallBack.bind(this))

    await (this.connectPromise = this.reconnect());
    await (this.connectedPromise = this.connectedInit());

    this.store = ChainStore;

    this.events.connectedNotify()

    return true;
  }

  static async disconnect() {
    return Api.getApis().close()
  }

  static async reconnect() {
    let res = await Api.getApis().instance(this.node, true).init_promise;
    this.chain = res[0].network;

    return res;
  }

  static statusCallBack(status) {
    console.log("WebSocket status:", status)
    if (status === 'closed') {
      console.log("WebSocket status, try to connect...");
      setTimeout(() => {
        this.reconnect().then(this.events.resubscribe.bind(this.events)).catch(console.error)
      }, 2000)
    }
  }

  static async connectedInit() {
    if (!this.connectPromise || this.blockReCall)
      return

    this.blockReCall = true

    this.db = Api.new('db_api');
    this.history = Api.new('history_api');
    this.network = Api.new('network_api');
    //this.crypto = Api.new('crypto_api');
    this.newTx = Transaction.newTx;

    this.assets = Asset.init(this.db);
    this.accounts = Account.init(this.db);
    this.fees = Fees.init(this.db);
    await this.fees.update();
  }

  static subscribe() {
    this.events.subscribe(...arguments)
  }

  static async login(accountName, password, feeSymbol = this.chain.core_asset) {
    let
      acc = await this.accounts[accountName],
      activeKey = PrivateKey.fromSeed(`${accountName}active${password}`),
      genPubKey = activeKey.toPublicKey().toString();

    if (genPubKey != acc.active.key_auths[0][0])
      throw new Error("The pair of login and password do not match!")

    let account = new this(accountName, activeKey.toWif(), feeSymbol);

    account.setMemoKey((acc.options.memo_key === genPubKey ? activeKey : PrivateKey.fromSeed(`${accountName}memo${password}`)).toWif())

    await account.initPromise;
    return account
  }

  static async loginFromFile(buffer, password, accountName, feeSymbol = this.chain.core_asset) {
    let backup_buffer = Aes.decrypt_with_checksum(
      PrivateKey.fromSeed(password),
      PublicKey.fromBuffer(buffer.slice(0, 33)),
      null /*nonce*/,
      buffer.slice(33)
    );

    let
      buffer_data = JSON.parse(lzma.decompress(backup_buffer)),
      wallet = buffer_data.wallet[0],
      password_aes = Aes.fromSeed(password),
      encryption_plainbuffer = password_aes.decryptHexToBuffer(wallet.encryption_key),
      aes_private = Aes.fromSeed(encryption_plainbuffer);

    let acc = await this.accounts[accountName];
    let accKey = buffer_data.private_keys.find(key => key.pubkey === acc.active.key_auths[0][0])

    if (!accKey)
      throw new Error(`Not found active key for account ${accountName}`);

    let private_key_hex = aes_private.decryptHex(accKey.encrypted_key);
    let activeKey = PrivateKey.fromBuffer(new Buffer(private_key_hex, "hex"));

    let account = new this(accountName, activeKey.toWif(), feeSymbol);

    let memoKey;
    if (acc.options.memo_key === acc.active.key_auths[0][0])
      memoKey = activeKey
    else {
      accKey = buffer_data.private_keys.find(key => key.pubkey === acc.options.memo_key)

      if (!accKey) {
        private_key_hex = aes_private.decryptHex(accKey.encrypted_key);
        memoKey = PrivateKey.fromBuffer(new Buffer(private_key_hex, "hex"));
      }
    }

    memoKey && account.setMemoKey(memoKey.toWif())

    await account.initPromise;
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

  static async getLimitOrders(quoteSymbol, baseSymbol, limit = 50) {
    return BitShares.db.get_limit_orders(
      (await BitShares.assets[quoteSymbol]).id,
      (await BitShares.assets[baseSymbol]).id,
      limit > 100 ? 100 : limit
    )
  }

  static async getOrderBook(quoteSymbol, baseSymbol, limit = 50) {
    return BitShares.db.get_order_book(
      (await BitShares.assets[quoteSymbol]).id,
      (await BitShares.assets[baseSymbol]).id,
      limit > 50 ? 50 : limit
    )
  }

  constructor(accountName, activeKey, feeSymbol = BitShares.chain.core_asset) {
    if (activeKey)
      this.activeKey = PrivateKey.fromWif(activeKey);

    this.newTx = () => {
      return Transaction.newTx([this.activeKey])
    }

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

  broadcast(tx, keys = [this.activeKey]) {
    return tx.broadcast(keys)
  }
  /*
  sendTransaction(type, operation) {
    let tx = new TransactionBuilder();
    tx.add_type_operation(type, operation)

    return this.broadcast(tx)
  }

  async broadcast(tx, keys = this.activeKey) {
    await tx.set_required_fees()

    if (keys.constructor.name !== 'Array')
      keys = [keys]

    keys.forEach(key =>
      tx.add_signer(key, key.toPublicKey().toPublicKeyString())
    )
    return tx.broadcast()
  }

  newTx() {
    return new TransactionBuilder()
  }*/

  async balances() {
    await this.initPromise;

    let assets = await Promise.all(Object.keys(arguments)
      .map(async index => (await BitShares.assets[arguments[index]]).id));
    let balances = await BitShares.db.get_account_balances(this.account.id, assets);
    return Promise.all(balances.map(balance => BitShares.assets.fromParam(balance)))
  }

  async buyOperation(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;

    let buyAsset = await BitShares.assets[buySymbol],
        baseAsset = await BitShares.assets[baseSymbol],
        buyAmount = Math.floor(amount * 10 ** buyAsset.precision),
        sellAmount = Math.floor(BigNumber(amount).times(price * 10 ** baseAsset.precision).toString());

    if (buyAmount == 0 || sellAmount == 0)
      throw new Error("Amount equal 0!")

    let params = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: baseAsset.toParam(sellAmount),
      min_to_receive: buyAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    }

    return { limit_order_create: params }
  }

  async buy() {
    let operation = await this.buyOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    let rtx = await tx.broadcast()
    return (await BitShares.db.get_objects([rtx[0].trx.operation_results[0][1]]))[0];
  }

  async sellOperation(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02") {
    await this.initPromise;

    let sellAsset = await BitShares.assets[sellSymbol],
        baseAsset = await BitShares.assets[baseSymbol],
        sellAmount = Math.floor(amount * 10 ** sellAsset.precision),
        buyAmount = Math.floor(BigNumber(amount).times(price * 10 ** baseAsset.precision).toString());

    if (buyAmount == 0 || sellAmount == 0)
      throw new Error("Amount equal 0!")

    let params = {
      fee: this.feeAsset.toParam(),
      seller: this.account.id,
      amount_to_sell: sellAsset.toParam(sellAmount),
      min_to_receive: baseAsset.toParam(buyAmount),
      expiration: expire,
      fill_or_kill: fill_or_kill,
      extensions: []
    }
  
    return {limit_order_create: params }
  }

  async sell() {
    let operation = await this.sellOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    let rtx = await tx.broadcast()
    return (await BitShares.db.get_objects([rtx[0].trx.operation_results[0][1]]))[0];
  }

  async orders() {
    await this.initPromise;
    return (await BitShares.db.get_full_accounts([this.account.id],false))[0][1].limit_orders
  }

  async getOrder(id) {
    await this.initPromise;
    return (await BitShares.db.get_objects([id]))[0];
  }

  async cancelOrderOperation(id) {
    await this.initPromise;

    let params = {
      fee: this.feeAsset.toParam(),
      fee_paying_account: this.account.id,
      order: id,
      extensions: []
    }

    return { limit_order_cancel: params }
  }
  async cancelOrder() {
    let operation = await this.cancelOrderOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    return tx.broadcast()
  }

  async memo(toName, message) {
    if (!this.memoKey)
      throw new Error("Not set memoKey!");

    let nonce = Date.now().toString(), //TransactionHelper.unique_nonce_uint64(),
        to = (await BitShares.accounts[toName]).options.memo_key;

    return {
      from: this.memoKey.toPublicKey().toPublicKeyString(),
      to,
      nonce,
      message: Aes.encrypt_with_checksum(this.memoKey, to, nonce, new Buffer(message, "utf-8"))
    }
  }

  memoDecode(memos) {
    if (!this.memoKey)
      throw new Error("Not set memoKey!");

    return Aes.decrypt_with_checksum(this.memoKey, memos.from, memos.nonce, memos.message)
      .toString("utf-8");
  }

  async transferOperation(toName, assetSymbol, amount, memo) {
    await this.initPromise;

    let asset = await BitShares.assets[assetSymbol],
        intAmount = Math.floor(amount * 10 ** asset.precision);

    if (intAmount == 0)
      throw new Error("Amount equal 0!")

    let params = {
      fee: this.feeAsset.toParam(),
      from: this.account.id,
      to: (await BitShares.accounts[toName]).id,
      amount: asset.toParam(intAmount),
      extensions: []
    };

    if (memo)
      params.memo = (typeof memo == "string") ? (await this.memo(toName, memo)) : memo;

    return { transfer: params }
  }

  async transfer() {
    let operation = await this.transferOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    return tx.broadcast()
  }

  async assetIssueOperation(toName, assetSymbol, amount, memo) {
    await this.initPromise;

    let asset = await BitShares.assets[assetSymbol],
        intAmount = Math.floor(amount * 10 ** asset.precision);

    if (intAmount === 0)
      throw new Error("Amount equal 0!");

    let params = {
      fee: this.feeAsset.toParam(),
      issuer: this.account.id,
      asset_to_issue: asset.toParam(intAmount),
      issue_to_account: (await BitShares.accounts[toName]).id
    };

    if (memo)
      params.memo = (typeof memo === "string") ? (await this.memo(toName, memo)) : memo;

    return { asset_issue: params }
  }

  async assetIssue() {
    let operation = await this.assetIssueOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    return tx.broadcast()
  }

  async assetReserveOperation(assetSymbol, amount) {
    await this.initPromise;

    let payer = this.account.id;

    let asset = await BitShares.assets[assetSymbol],
        intAmount = Math.floor(amount * 10 ** asset.precision);

    if (intAmount === 0)
      throw new Error("Amount equal 0!");

    let params = {
      fee: this.feeAsset.toParam(),
      amount_to_reserve: asset.toParam(intAmount),
      payer,
      extensions: []
    };
  
    return { asset_reserve: params }
  }

  async assetReserve() {
    let operation = await this.assetReserveOperation(...arguments);

    let tx = this.newTx()
    tx.add(operation)
    return tx.broadcast()
  }
}
