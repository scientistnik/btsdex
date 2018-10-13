import { TransactionBuilder } from "bitsharesjs";

class Transaction {
  static newTx(keys) {
    var tx = new Transaction(keys)

    return new Proxy(tx, tx)
  }

  constructor(keys) {
    this.tx = new TransactionBuilder()
    this.keys = keys
  }

  get = (obj, name) => {
    if (obj[name])
      return obj[name]

    return (params) => {
      this.add({ [name]: params })
    }
  }

  add = (operations) => {
    Object.keys(operations).forEach(key => 
      this.tx.add_type_operation(key, operations[key])
    )
  }

  broadcast = async keys => {
    await this.tx.set_required_fees();
    (keys ? keys : this.keys).forEach(key => 
      this.tx.add_signer(key, key.toPublicKey().toPublicKeyString())
    )
    return this.tx.broadcast();
  }
}

export default Transaction