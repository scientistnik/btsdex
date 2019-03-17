const assert = require("assert"),
  //fs = require("fs"),
  BitShares = require("../lib");

require("dotenv").config();

describe("Transaction class", () => {
  before(async () => {
    await BitShares.connect(process.env.BITSHARES_NODE);
  });

  describe("#cost()", () => {
    it.only("get cost", async () => {
      let acc = await BitShares.login(
        process.env.BITSHARES_ACCOUNT,
        process.env.BITSHARES_PASSWORD
      );
      let tx = acc.newTx();

      let operation = await acc.transferOperation("trade-bot", "TEST", 1);
      tx.add(operation);

      operation = await acc.transferOperation("trade-bot", "TEST", 1);
      tx.add(operation);

      let cost = await tx.cost().catch(console.log);
      console.log(JSON.stringify(cost, null, 2));
    });
  });
});
