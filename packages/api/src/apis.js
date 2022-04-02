export const METHODS_WITH_CALLBACK = [
  "set_subscribe_callback",
  "set_pending_transaction_callback",
  "subscribe_to_market",
  "set_block_applied_callback",
  "broadcast_transaction_with_callback",
];

export const APIs = {
  database: {
    id: null,
    name: "database",
    methods: [
      /* many function names */
    ],
  },
  network: {
    id: null,
    name: "network_broadcast",
    methods: [
      /* many function names */
    ],
  },
  block: { id: null, name: "block", methods: ["get_blocks"] },
  orders: { id: null, name: "orders", methods: ["get_grouped_limit_orders"] },
  asset: {
    id: null,
    name: "asset",
    methods: ["get_asset_holders", "get_all_asset_holders"],
  },
  history: {
    id: null,
    name: "history",
    methods: [
      "get_account_history",
      "get_account_history_operations",
      "get_relative_account_history",
      "get_fill_order_history",
      "get_market_history",
      "get_market_history_buckets",
    ],
  },
  crypto: {
    id: null,
    name: "crypto",
    methods: [
      "blind",
      "blind_sum",
      "range_get_info",
      "range_proof_sign",
      "verify_sum",
      "verify_range",
      "verify_range_proof_rewind",
    ],
  },
};

const sortAPIbyCountMethods = Object.keys(APIs)
  .filter(apiName => APIs[apiName].methods.length > 0)
  .sort((a, b) => APIs[a].methods.length > APIs[b].methods.length);

export const getIdByMethod = method =>
  APIs[
    sortAPIbyCountMethods.find(apiName =>
      APIs[apiName].methods.includes(method)
    ) || "database"
  ].id;

export const setAPIId = (apiName, id) => (APIs[apiName].id = id);
