#!/usr/bin/env node

const repl = require('repl');
const BitShares = require('./index.js');

function initializeContext(context) {
  let node = process.argv.includes("--testnet") ? "wss://node.testnet.bitshares.eu" : undefined
  
  BitShares.init(node)
  BitShares.connect().then(() => {
    context.accounts = BitShares.accounts;
    context.assets = BitShares.assets;
    context.db = BitShares.db;
    context.history = BitShares.history;
    context.network = BitShares.network;
    context.fees = BitShares.fees;
  })

  context.BitShares = BitShares;
  context.btsdex = BitShares;
  context.login = BitShares.login.bind(BitShares)
  context.generateKeys = BitShares.generateKeys
}

const r = repl.start({ prompt: '> ' });
initializeContext(r.context);

r.on('reset', initializeContext);
