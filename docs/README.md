# Implementation

Package for work with BitShares DEX.
The main class in the package is `BitShares`. All you need is in it. There are a couple more helper classes, but they are not really designed for use outside of the `BitShares` class.

The `BitShares` class consists of static methods intended for working with the BitShares public blockchain API. Using the BitShares class, you can create an object whose methods provide access to the private part of the BitShares blockchain API.

## Setup

### If you use `npm`
This library can be obtained through npm:
```
$ npm install btsdex
```
If you want use [REPL-mode](#repl-mode):
```
$ npm install -g btsdex
```

### If you use `browser`
Include [this](https://github.com/scientistnik/btsdex/releases) in html-file:
```
<script src="btsdex.min.js"></script>
```
After that in console aviable `BitShares` class.

## Usage

__btsdex__ package contain class `BitShares`: 
```js
const BitShares = require('btsdex')
```
To connect to the BitShares network, you must call `connect` method:
```js
await BitShares.connect();
```
By default, `BitShares` connected to `wss://bitshares.openledger.info/ws`. If you want set another node to connect:
```js
await BitShares.connect("wss://bitshares.openledger.info/ws")
```

You can also connect to the network using the [event system](#event-system).

### Public API

After the connection, you can use any public method from [official documentation](http://dev.bitshares.works/en/master/api/blockchain_api.html) (if the method is still relevant!).

#### Database API

To access the [Database API](http://dev.bitshares.works/en/master/api/blockchain_api/database.html), you can use the __BitShares.db__ object.

An example of methods from the Database API:

[__get_objects(const vector <object_id_type> & ids) const__](http://dev.bitshares.works/en/master/api/blockchain_api/database.html#_CPPv3NK8graphene3app12database_api11get_objectsERK6vectorI14object_id_typeE)

[__list_assets(const string & lower_bound_symbol, uint32_t limit) const__](http://dev.bitshares.works/en/master/api/blockchain_api/database.html#_CPPv3NK8graphene3app12database_api11list_assetsERK6string8uint32_t)


To use them:
```js
let obj = await BitShares.db.get_objects(["1.3.0"])
let bts = await BitShares.db.list_assets("BTS", 100)
```

#### History API

To access the [Account History API](http://dev.bitshares.works/en/master/api/blockchain_api/history.html), you can use the __BitShares.history__ object.

Example of a method from the Account History API:

[__get_account_history (account_id_type account, operation_history_id_type stop = operation_history_id_type (), unsigned limit = 100, operation_history_id_type start = operation_history_id_type ()) const__](http://dev.bitshares.works/en/master/api/blockchain_api/history.html#_CPPv3NK8graphene3app11history_api19get_account_historyEKNSt6stringE25operation_history_id_typej25operation_history_id_type)

To use it:
```js
let ops = await BitShares.history.get_account_history("1.2.849826", "1.11.0", 10, "1.11.0")
```

### Private API

If you want to have access to account operations, you need to create a BitShares object. 

If you know `privateActiveKey`:
```js
let acc = new BitShares(<accountName>, <privateActiveKey>)
```
or if you know `password`:
```js
let acc = BitShares.login(<accountName>, <password>)
```
or if you have `bin`-file:
```js
let buffer = fs.readFileSync(<bin-file path>);
let acc = BitShares.loginFromFile(buffer, <wallet-password>, <accountName>)
```

While this object can not much: buy, sell, transfer, cancel order, asset reserve, asset issue and more.

Signatures of methods:
```js
acc.buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
acc.sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
acc.cancelOrder(id)
acc.transfer(toName, assetSymbol, amount, memo)
acc.assetIssue(toName, assetSymbol, amount, memo)
acc.assetReserve(assetSymbol, amount)
```

Examples of using:
```js
await acc.buy("OPEN.BTC", "BTS", 0.002, 140000)
await acc.sell("BTS", "USD", 187, 0.24)
await acc.transfer("scientistnik", "BTS", 10)
await acc.assetIssue("scientistnik", "ABC", 10)
await acc.assetReserve("ABC", 12)
```

If you want to send tokens with memo and get `acc` from `constructor` (use `new BitShares()`), then before that you need to set a private memo-key:
```js
bot.setMemoKey(<privateMemoKey>)
await bot.transfer("scientistnik", "USD", 10, "Thank you for BTSDEX!")
```
### Transaction Builder

Each private transaction is considered accepted after being included in the block. Blocks are created every 3 seconds. If we need to perform several operations, their sequential execution can take considerable time. Fortunately, several operations can be included in a single transaction. For this you need to use transaction builder.

For create new transaction:
```js
let tx = BitShares.newTx([<activePrivateKey>,...])
```
or if you have account object `acc`:
```js
let tx = acc.newTx()
```

For get operation objects:
```js
let operation1 = await acc.transferOperation("scientistnik", "BTS", 10)
let operation2 = await acc.assetIssueOperation("scientistnik", "ABC", 10)
...
```
Added operation to transaction:
```js
tx.add(operation1)
tx.add(operation2)
...
```
After broadcast transaction:
```js
await tx.broadcast()
```
or
```js
await acc.broadcast(tx)
```

The account has a lot more operations available than an instance of the bitshares class. If you know what fields the transaction you need consists of, you can use the transaction builder for that.

For example:
```js
let BitShares = require("btsdex")

BitShares.subscribe("connected", start)

async function start() {
  let acc = await BitShares.login(<accountName>, <password>)

  let params = {
    fee: {amount: 0, asset_id: "1.3.0"},
    name: "trade-bot3",
    registrar: "1.2.21058",
    referrer: "1.2.21058",
    referrer_percent: 5000,
    owner: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [[<ownerPublicKey>, 1]],
      address_auths: []
    },
    active: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [[<activePublicKey>, 1]],
      address_auths: []
    },
    options: {
      memo_key: <memoPublicKey>,
      voting_account: "1.2.5",
      num_witness: 0,
      num_committee: 0,
      votes: []
    },
    extensions: []
  };

  let tx = acc.newTx()
  tx.account_create(params) // 'account_create' is name operation
  await tx.broadcast()
}
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

BitShares.subscribe('connected', start);

async function start() {
  // something is happening here
}
```

##### The `block` event

The `block` event is triggered when a new block is created in the blockchain. The first event subscription automatically creates a subscription to the `connected` event, and if this is the first subscription, it will cause a connection to the blockchain.

```js
const BitShares = require("btsdex");

BitShares.subscribe('block', newBlock);

// need to wait ~ 10-15 seconds
async function newBlock(obj) {
  console.log(obj); // [{id: '2.1.0', head_block_number: 17171083, time: ...}]
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

BitShares.subscribe('account', changeAccount, 'scientistnik');

async function changeAccount (array) {
  console.log(array); // [{id: '1.11.37843675', block_num: 17171423, op: ...}, {...}]
}
```
In all the signed functions, an array of account history objects is transferred, which occurred since the last event.

### REPL-mode

If you install `btsdex`-package in global storage, you may start `btsdex` exec script:
```js
$ btsdex
>|
```
This command try autoconnect to mainnet BitShares. If you want to connect on testnet, try this:
```js
$ btsdex --testnet
>|
```

It is nodejs REPL with several variables:
- `BitShares`, main class `BitShares` package
- `login`, function to create object of class `BitShares`
- `generateKeys`, to generateKeys from login and password
- `accounts`, is analog `BitShares.accounts`
- `assets`, is analog `BitShares.assets`
- `db`, is analog `BitShares.db`
- `history`, is analog `BitShares.hostory`
- `network`, is analog `BitShares.network`
- `fees`, is analog `BitShares.fees`

#### For example

```js
$ btsdex
> assets["bts"].then(console.log)
```

#### Shot request

If need call only one request, you may use `--account`, `--asset`, `--block`, `--object`, `--history` or `--transfer` keys in command-line:
```js
$ btsdex --account <'name' or 'id' or 'last number in id'>
{
  "id": "1.2.5992",
  "membership_expiration_date": "1970-01-01T00:00:00",
  "registrar": "1.2.37",
  "referrer": "1.2.21",
  ...
}
$ btsdex --asset <'symbol' or 'id' or 'last number in id'>
{
  "id": "1.3.0",
  "symbol": "BTS",
  "precision": 5,
  ...
}
$ btsdex --block [<number>]
block_num: 4636380
{
  "previous": "0046bedba1317d146dd6afbccff94412d76bf094",
  "timestamp": "2018-10-01T13:09:40",
  "witness": "1.6.41",
  ...
}
$ btsdex --object 1.2.3
{
  "id": "1.2.3",
  "membership_expiration_date": "1969-12-31T23:59:59",
  "registrar": "1.2.3",
  "referrer": "1.2.3",
  ...
}
$ btsdex --history <account> [<limit>] [<start>] [<stop>]
[
  {
    "id": "1.11.98179",
    "op": [
      0,
  ...
}]
$ btsdex --transfer <from> <to> <amount> <asset> [--key]
Transfered <amount> <asset> from '<from>' to '<to>' with memo '<memo>'
```

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

### Some examples:

```js
const BitShares = require('btsdex')
KEY = 'privateActiveKey'

BitShares.subscribe('connected', startAfterConnected)

async function startAfterConnected() {
  let bot = new BitShares('trade-bot', KEY)

  let iam = await BitShares.accounts['trade-bot'];
  let orders = await BitShares.db.get_full_accounts([iam.id], false);
  
  orders = orders[0][1].limit_orders;
  let order = orders[0].sell_price;
  console.log(order)
}
```
## Documentation
For more information, look [wiki](https://scientistnik.github.io/btsdex) or in `docs`-folder.

## Contributing

Bug reports and pull requests are welcome on GitHub. 

`master`-branch use for new release. For new feature use `dev` branch. All pull requests are accepted in `dev` branch.

## License

The package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
