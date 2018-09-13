__BitShares.assets__ use for get asset object.

If you know name asset, `BitShares.assets` behave like map:
```js
let usd = await BitShares.assets.usd;
let btc = await BitShares.assets["OPEN.BTS"];
let bts = await BitShares.assets["bts"];
```
See current assets in map:
```js
console.log(BitShares.assets.map); // {}
let bts = await BitShares.assets.bts;
console.log(BitShares.assets.map); // { BTS: Asset {...} }
```
If you want get by id:
```js
let bts = await BitShares.assets.id("1.3.0");
```
Each Asset have `update()` method to update asset data:
```js
await bts.update();
```
For update all asset in current map:
```js
await BitShares.assets.update();
```
If you want get asset have reserve name ('id' or 'update'):
```js
let asset = BitShares.assets.getAsset('update');
```
If you want to know market fee this asset:
```js
let usd = await BitShares.assets.usd;
console.log(usd.fee()); // 0.001
```