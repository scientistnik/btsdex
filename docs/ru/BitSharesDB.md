To access the [Database API](http://docs.bitshares.org/api/database.html), you can use the __BitShares.db__ object.
## get_objects()
Signature:
```js
get_objects(const vector<object_id_type> &ids)
```
### Example:
```js
const BitShares = require("btsdex");
BitShares.init(config.node);
BitShares.subscribe('connected', start);

async function start() {
  let [bts, account, order] = await BitShares.db.get_objects(['1.3.0','1.2.849826','1.7.65283036']);

  console.log(bts, account, order);
}
```
