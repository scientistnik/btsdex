# btsdex
Package for work with BitShares DEX


## Setup

This library can be obtained through npm:
```
npm install btsdex
```

## Usage

__btsdex__ package contain class `BitShares`: 
```js
const BitShares = require('btsdex')
```
`BitShares` contains static methods for work with [public API](http://docs.bitshares.org/api/blockchain-api.html), and dynamic methods for work with [wallet API](http://docs.bitshares.org/api/wallet-api.html).

### Initialization

Example initialization:
```js
BitShares.init({node:'wss://bitshares.openledger.info/ws'})
```
After initialization, you can connect:
```js
BitShares.connect()
```
`BitShares.connect()` return Promise, resolve it when connection consists.

You may to subscribe to connection event:
```js
BitShares.subscribe('connected',functionToCall)
```

### Public API

After connection, you may call public api methods. For example `BitShares.db` return wrapper for [database API](http://docs.bitshares.org/api/database.html):
```js
BitShares.db.get_objects("1.3.0")
BitShares.db.list_assets("BTS",100)
```
`BitShares.history` is wrapper for [history API](http://docs.bitshares.org/api/history.html):
```js
BitShares.history.get_market_history("1.3.121","1.3.861","2018-04-04T20:12:22","2018-04-01T20:12:22",86400)
```

### Private API

If you want access to private API, you need create object from `BitShares` class:
```js
let bot = new BitShares('accountName','privateActiveKey')
```
`bot` have `buy`,`sell` and `cancelOrder` methods:
```js
bot.buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02")
bot.sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02:02:02")
bot.cancelOrder(id)
```

### Some examples:

```js
const BitShares = require('btsdex')
KEY = 'privateActiveKey'

BitShares.init({node:'wss://bitshares.openledger.info/ws'})

async function startAfterConnected() {
  let bot = new BitShares('trade-bot',KEY)

  let iam = await BitShares.accounts['trade-bot'];
  let orders = await BitShares.db.get_full_accounts([iam.id],false);
  
  orders = orders[0][1].limit_orders;
  let order = orders[0].sell_price;
  console.log(order)
}

BitShares.subscribe('connected',startAfterConnected)
BitShares.connect()
```

## Contributing

Bug reports and pull requests are welcome on GitHub.

## License

The package is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).
