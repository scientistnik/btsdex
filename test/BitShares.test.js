const assert = require("assert"),
  fs = require("fs"),
  BitShares = require("../lib");

require("dotenv").config();

describe("BitShares class", () => {
  describe("#connect()", () => {
    it("connect", async () => {
      let { connect, disconnect } = BitShares;
      assert.equal(
        await connect(process.env.BITSHARES_NODE),
        true,
        "Return not 'true'"
      );

      await disconnect();

      try {
        await BitShares.db.get_objects(["1.3.0"]);
      } catch (error) {
        return true;
      }
      throw Error("Disconnect don't work");
    });

    it.skip("subscribe", async () => {
      BitShares.subscribe("connected", console.log);
    });
  });

  describe("#login()", () => {
    before(async () => {
      await BitShares.connect(process.env.BITSHARES_NODE);
    });

    after(BitShares.disconnect);

    it("login", async () => {
      let { login } = BitShares;
      let acc = await login(
        process.env.BITSHARES_ACCOUNT,
        process.env.BITSHARES_PASSWORD
      );
      assert.equal(acc.constructor.name, "BitShares", "Don't return account");
    });

    it("loginFromFile", async () => {
      let { loginFromFile } = BitShares;
      let buffer = fs.readFileSync(process.env.BITSHARES_WALLET_FILE);

      let acc = await loginFromFile(
        buffer,
        process.env.BITSHARES_WALLET_PASS,
        process.env.BITSHARES_ACCOUNT
      );

      assert.equal(acc.constructor.name, "BitShares", "Don't return account");
    });
  });

  describe.skip("#subscribe", () => {
    it("connected", async () => {
      await BitShares.subscribe("connected", console.log);
    });

    it("block", async () => {
      await BitShares.subscribe("block", console.log);
    });

    it("account", async () => {
      BitShares.node = process.env.BITSHARES_NODE;
      await BitShares.subscribe("account", console.log, "trade-bot");
    });
  });

  describe.skip("#assetIssue()", () => {
    before(async () => {
      await BitShares.connect(process.env.BITSHARES_NODE);
    });

    after(BitShares.disconnect);

    it("issue asset", async () => {
      let bot = await BitShares.login(
        process.env.BITSHARES_ACCOUNT,
        process.env.BITSHARES_PASSWORD
      );
      let asset = (await bot.balances(process.env.ISSUE_ASSET))[0];
      let balanceBefore = asset.amount / 10 ** asset.asset.precision;

      await bot.assetIssue(
        process.env.BITSHARES_ACCOUNT,
        process.env.BITSHARES_ISSUE_ASSET,
        10,
        "Hello"
      );

      let balanceAfter =
        (await bot.balances(process.env.BITSHARES_ISSUE_ASSET))[0].amount /
        10 ** asset.asset.precision;
      assert.equal(balanceBefore + 10, balanceAfter, "Asset don't issued");
    });

    it("generateKeys", async () => {
      console.log(
        BitShares.generateKeys(
          process.env.BITSHARES_ACCOUNT,
          process.env.BITSHARES_PASSWORD
        )
      );
    });
  });
});
