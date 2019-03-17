export default class Account {
  static init(db) {
    if (this.instance) return this.instance;

    this.db = db;
    this.map = {};
    this.instance = new Proxy(this, this);
    return this.instance;
  }

  static get(obj, name) {
    if (obj[name]) return obj[name];

    return /^1\.2\.\d+$/.test(name) || !isNaN(name)
      ? this.id(name)
      : this.getAccout(name);
  }

  static async getAccout(_name) {
    let name = _name.toLowerCase();

    if (this.map[name]) return this.map[name];

    let acc = await this.db.get_account_by_name(name);

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

    let acc = (await this.db.get_accounts([id]))[0];

    if (!acc) throw new Error(`Not found account by id ${id}!`);

    this.map[acc.name] = new this(acc);
    return this.map[acc.name];
  }

  static async update() {
    let allData = await this.db.get_accounts(
      Object.keys(this.map).map(name => this.map[name].id)
    );
    allData.forEach(rpcData => Object.assign(this.map[rpcData.name], rpcData));
  }

  constructor(rpcObj) {
    Object.assign(this, rpcObj);
  }

  async update() {
    Object.assign(this, (await Account.db.get_accounts([id]))[0]);
  }
}
