To access the [Account History API](http://docs.bitshares.org/api/history.html#account-history), you can use the __BitShares.history__ object.

## get_account_history()
Signature:
```js
get_account_history(account_id_type account, operation_history_id_type stop = operation_history_id_type (), unsigned limit = 100, operation_history_id_type start = operation_history_id_type ())
```
### Example
```js
let ops = await BitShares.history.get_account_history("1.2.849826", "1.11.0", 10, "1.11.0")
```