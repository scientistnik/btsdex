```js
BitShares.init("wss://bitshares.openledger.info/ws");
BitShares.subscribe("connected", start);

var tx;

async function start() {
  BitShares.subscribe("block",update)

  let bot = new BitShares.login("trade-bot", "<password>");
  [tx] = await bot.transfer("scientistnik", "usd", 10)
}

async function update([newBlock]) {
  if (tx && (tx.block_num + 21) < newBlock.head_block_number) {
    let blockTx = await BitShares.db.get_transaction(tx.block_num, tx.trx_num)
    if (blockTx.signatures[0] === tx.trx.signatures[0])
      console.log("tx irreversible")
  }
}
```