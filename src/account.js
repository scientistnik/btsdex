import { database } from "btsdex-api";

class Account {
  static map = {};

  static async getAccout(_name) {
    let name = _name.toLowerCase();

    if (this.map[name]) return this.map[name];

    let acc = await database.getAccountByName(name);

    if (!acc || acc.name !== name)
      throw new Error(
        `Not found account ${name}! Blockchain return ${acc ? acc.name : acc}`
      );

    this.map[name] = new this(acc);
    return this.map[name];
  }

  static async id(id) {
    if (!isNaN(id)) id = `1.2.${id}`;

    let name = Object.keys(this.map).find(name => this.map[name].id == id);

    if (name) return this.map[name];

    let acc = (await database.getAccounts([id]))[0];

    if (!acc) throw new Error(`Not found account by id ${id}!`);

    this.map[acc.name] = new this(acc);
    return this.map[acc.name];
  }

  static async update() {
    let allData = await database.getAccounts(
      Object.keys(this.map).map(name => this.map[name].id)
    );
    allData.forEach(rpcData => Object.assign(this.map[rpcData.name], rpcData));
  }

  constructor(rpcObj) {
    Object.assign(this, rpcObj);
  }

  async update() {
    Object.assign(this, (await database.getAccounts([id]))[0]);
  }
}

export default new Proxy(Account, {
  get(obj, name) {
    if (obj[name]) return obj[name];

    return /^1\.2\.\d+$/.test(name) || !isNaN(name)
      ? obj.id(name)
      : obj.getAccout(name);
  },
});
