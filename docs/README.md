# Implementation

The main class in the package is `BitShares`. All you need is in it. There are a couple more helper classes, but they are not really designed for use outside of the `BitShares` class. Perhaps at some next version this will change.

The `BitShares` class consists of static methods intended for working with the BitShares public blockchain API. Using the BitShares class, you can create an object whose methods provide access to the private part of the BitShares blockchain API.

# Install
```
$ npm install btsdex
```
Requre in your project:
```js
const BitShares = require("btsdex");
```

# Use

To connect to the BitShares network, you must initialize and connect:
```js
BitShares.init("wss://bitshares.openledger.info/ws")
await BitShares.connect();
```
### Public API

After the connection, you can use any public method from [official documentation](http://docs.bitshares.org/api/blockchain-api.html) (if the method is still relevant!).

#### Database API

To access the [Database API](http://docs.bitshares.org/api/database.html), you can use the __BitShares.db__ object.

An example of methods from the Database API:

[__get_objects (const vector <object_id_type> & ids) const__](http://docs.bitshares.org/api/database.html#objects)

[__list_assets (const string & lower_bound_symbol, uint32_t limit) const__](http://docs.bitshares.org/api/database.html#assets)


To use them:
```js
let obj = await BitShares.db.get_objects(["1.3.0"])
let bts = await BitShares.db.list_assets("BTS", 100)
```
#### History API

To access the [Account History API](http://docs.bitshares.org/api/history.html), you can use the __BitShares.history__ object.

Example of a method from the Account History API:

[__get_account_history (account_id_type account, operation_history_id_type stop = operation_history_id_type (), unsigned limit = 100, operation_history_id_type start = operation_history_id_type ()) const__](http://docs.bitshares.org/api/history.html#account-history)

To use it:
```js
let ops = await BitShares.history.get_account_history("1.2.849826", "1.11.0", 10, "1.11.0")
```
### Private API

If you want to have access to account operations, you need to create a BitShares object:
```js
let bot = new BitShares("accountName", "privateActiveKey")
```

While this object can not much: buy, sell, transfer, cancel orders.

Signatures of methods:
```js
bot.buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
bot.sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
bot.cancelOrder(id)
bot.transfer(toName, assetSymbol, amount, memo)
```

Examples of using:
```js
await bot.buy("OPEN.BTC", "BTS", 0.002, 140000)
await bot.sell("BTS", "USD", 187, 0.24)
await bot.transfer("scientistnik", "BTS", 10)
```

If you want to send tokens with memo, then before that you need to set a private memo-key:
```js
bot.setMemoKey("privateMemoKey")
await bot.transfer("scientistnik", "USD", 10, "Thank you for BTSDEX!")
```
### Event system
Very often we have to expect, when there will be some action in the blockchain, to which our software should respond. The idea of ​​reading each block and viewing all the operations in it, seemed to me ineffective. Therefore, this update adds an event system.

#### Event types

At the moment, __BTSDEX__ has three types of events:
* `connected` - works once after connecting to the blockchain;
* `block` - it works when a new block is created in the blockchain;
* `account` - occurs when the specified account is changed (balance change).

For example:
```js
const BitShares = require("btsdex");

BitShares.init("wss://bitshares.openledger.info/ws");

BitShares.subscribe('connected', startAfterConnected);
BitShares.subscribe('block', callEachBlock);
BitShares.subscribe('account', changeAccount, 'trade-bot');

async function startAfterConnected() {/* is called once after connecting to the blockchain */}
async function callEachBlock(obj) {/* is called with each block created */}
async function changeAccount(array) {/* is called when you change the 'trade-bot' account */}
```

##### The `connected` event

This event is triggered once, after connecting to the blockchain. Any number of functions can be subscribed to this event and all of them will be called after connection.

```js
BitShares.subscribe('connected', firstFunction);
BitShares.subscribe('connected', secondFunction);
```

Another feature of the event is that when you first subscription call the method `BitShares.connect()`, i.e. will be an automatic connection. If by this time the connection to the blockchain has already been connected, then it will simply call the function.

Now it's not necessary to explicitly call `BitShares.connect()`, it's enough to subscribe to the `connected` event.

```js
const BitShares = require("btsdex");

BitShares.init("wss://bitshares.openledger.info/ws");
BitShares.subscribe('connected', start);

async function start() {
  // something is happening here
}
```

##### The `block` event

The `block` event is triggered when a new block is created in the blockchain. The first event subscription automatically creates a subscription to the `connected` event, and if this is the first subscription, it will cause a connection to the blockchain.

```js
const BitShares = require("btsdex");

BitShares.init("wss://bitshares.openledger.info/ws");
BitShares.subscribe('block', newBlock);

// need to wait ~ 10-15 seconds
async function newBlock(obj) {
  console.log (obj); // [{id: '2.1.0', head_block_number: 17171083, time: ...}]
}
```

As you can see from the example, an object with block fields is passed to all the signed functions.

##### The `account` event

The `account` event is triggered when certain changes occur (balance changes). These include:
* If the account sent someone one of their assets
* If an asset has been sent to an account
* If the account has created an order
* If the account order was executed (partially or completely), or was canceled.

The first subscriber to `account` will call a `block` subscription, which in the end will cause a connection to the blockchain.

Example code:
```js
const BitShares = require("btsdex");

BitShares.init("wss://bitshares.openledger.info/ws");
BitShares.subscribe('account', changeAccount, 'trade-bot');

async function changeAccount (array) {
  console.log(array); // [{id: '1.11.37843675', block_num: 17171423, op: ...}, {...}]
}
```
In all the signed functions, an array of account history objects is transferred, which occurred since the last event.

### Helper classes
There are a couple more helper classes, such as __BitShares.assets__ and __BitShares.accounts__:
```js
let usd = await BitShares.assets.usd;
let btc = await BitShares.assets["OPEN.BTS"];
let bts = await BitShares.assets["bts"];

let iam = await BitShares.accounts.scientistnik;
let tradebot = await BitShares.accounts["trade-bot"];
```
The returned objects contain all the fields that blockchain returns when the given asset or account name is requested.