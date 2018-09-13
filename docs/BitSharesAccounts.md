__BitShares.accounts__ use for get account object.

If you know account name, `BitShares.assets` behave like map:
```js
let iam = await BitShares.accounts.scientistnik;
let tradebot = await BitShares.accounts["trade-bot"];
```

See current accounts in map:
```js
console.log(BitShares.accounts.map); // {}
let bts = await BitShares.accounts.scientistnik;
console.log(BitShares.accounts.map); // { scientistnik: Account {...} }
```
If you want get by id:
```js
let scientistnik = await BitShares.accounts.id("1.2.440272");
```
Each Account have `update()` method to update account data:
```js
await scientistnik.update();
```
For update all account in current map:
```js
await BitShares.accounts.update();
```
If you want get account have reserve name ('id' or 'update'):
```js
let acc = BitShares.accounts.getAccount('update');
```