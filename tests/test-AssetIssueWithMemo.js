const BitShares =  require("../index.js");
const fs = require("fs");
const nconf = require("nconf");
nconf.argv().file("test-config.json");

let TEST_KEY = nconf.get("KEY");
let TEST_SENDER = nconf.get("SENDER");
let TEST_ASSET = nconf.get("ASSET");
let TEST_RECIPIENT = 'techn0log';
let TEST_MEMO = nconf.get("MEMO");
let TEST_AMOUNT = 10.51;

BitShares.init("wss://bitshares.openledger.info/ws");
BitShares.subscribe('connected', test);

async function test() {
    let bot = new BitShares(TEST_SENDER, TEST_KEY);
    bot.setMemoKey(TEST_KEY);
    console.log(await bot.assetIssue(TEST_RECIPIENT, TEST_ASSET, TEST_AMOUNT, TEST_MEMO));
}
