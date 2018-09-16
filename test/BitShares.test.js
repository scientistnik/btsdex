const assert = require('assert'),
      BitShares = require('../index.js');

require('dotenv').config();

describe('BitShares class', () => {
  describe('#assetIssue()', () => {

    before(async () => {
      BitShares.init(process.env.NODE, false, false);
      await BitShares.connect();
    });

    after(async () => {
      await BitShares.disconnect();
    })

    it('issue asset', async () => {
      let bot = await BitShares.login(process.env.ACCOUNT, process.env.PASSWORD);
      let asset = (await bot.balances(process.env.ISSUE_ASSET))[0];
      let balanceBefore = asset.amount / 10 ** asset.asset.precision;
      
      await bot.assetIssue(process.env.ACCOUNT, process.env.ISSUE_ASSET, 10, "Hello");

      let balanceAfter = (await bot.balances(process.env.ISSUE_ASSET))[0].amount / 10 ** asset.asset.precision;
      assert.equal(balanceBefore + 10, balanceAfter, "Asset don't issued")
    });

  });
});