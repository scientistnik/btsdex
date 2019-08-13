```js
const BitShares = require("x4tdex"),
      {Apis} = require("bitsharesjs-ws");

Apis.setRpcConnectionStatusCallback(statusCallBack)

function statusCallBack(status) {
  if (status === 'closed') {
    console.log("Status connection: closed")
    let reconnectTimer = setInterval(async () => {
      try {
        await BitShares.reconnect()
        clearInterval(reconnectTimer)
      } catch(error) {
        console.log(error)
      }
    }, 1000)
  }
}
```