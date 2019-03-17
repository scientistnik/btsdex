"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _bignumber = _interopRequireDefault(require("bignumber.js"));

//https://github.com/bitshares/bitshares-core/blob/master/libraries/chain/include/graphene/chain/protocol/operations.hpp#L44-L97
const operations = ["transfer", "limit_order_create", "limit_order_cancel", "call_order_update", "fill_order", // VIRTUAL
"account_create", "account_update", "account_whitelist", "account_upgrade", "account_transfer", "asset_create", "asset_update", "asset_update_bitasset", "asset_update_feed_producers", "asset_issue", "asset_reserve", "asset_fund_fee_pool", "asset_settle", "asset_global_settle", "asset_publish_feed", "witness_create", "witness_update", "proposal_create", "proposal_update", "proposal_delete", "withdraw_permission_create", "withdraw_permission_update", "withdraw_permission_claim", "withdraw_permission_delete", "committee_member_create", "committee_member_update", "committee_member_update_global_parameters", "vesting_balance_create", "vesting_balance_withdraw", "worker_create", "custom", "assert", "balance_claim", "override_transfer", "transfer_to_blind", "blind_transfer", "transfer_from_blind", "asset_settle_cancel", // VIRTUAL
"asset_claim_fees", "fba_distribute", // VIRTUAL
"bid_collateral", "execute_bid"];

class Fees {
  static init(db) {
    this.db = db;
    if (this.instance) return this.instance;
    this.instance = new this();
    return this.instance;
  }

  async update() {
    let obj = (await Fees.db.get_global_properties()).parameters.current_fees;
    obj.parameters.forEach((param, index) => {
      this[operations[index]] = param[1].fee ? Number((0, _bignumber.default)(param[1].fee).div(10 ** 5).toString()) : param[1];
    });
  }

  operations(index) {
    if (index) return operations[index];else return operations;
  }

}

exports.default = Fees;