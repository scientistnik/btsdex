# Реализация

Этот пакет создан для  работы с BitShares DEX.
Основной класс в пакете `BitShares`. Там есть все что вам нужно. Еще там есть несколько классов упрощающие работу, но они не используются без `BitShares` класса.

`BitShares` класс содержит статические методы для работы с публичными API блокчейна BitShares. Через объект `BitShares` класса, вы получаете доступ к  методам для записи в блокчейн.

## Установка

### Если вы используете `npm`
Установка пакета через npm:
```
$ npm install btsdex
```
Если хотите использовать [REPL-режим](#repl-режим):
```
$ npm install -g btsdex
```

### Если хотите использовать в `браузере`
Включите [это](https://github.com/scientistnik/btsdex/releases) в ваш html-файл:
```
<script src="btsdex.min.js"></script>
```
После этого в консоли будет доступен `BitShares` класс.

## Использование

__btsdex__ пакет содержит класс `BitShares`: 
```js
const BitShares = require('btsdex')
```
Для подключения к BitShares сети, необходимо вызвать метод `connect`:
```js
await BitShares.connect();
```
По умолчанию, `BitShares` подключается к `wss://bitshares.openledger.info/ws`. Если хотите установить другую ноду для подключения:
```js
await BitShares.connect("wss://bitshares.openledger.info/ws")
```

Для подключения, можно также использовать [систему событий](#Система-событий).

### Публичный API

После подключения, вы можете использовать публичные методы из [официальной документации](http://dev.bitshares.works/en/master/api/blockchain_api.html) (если этот метод еще актуален!).

#### Database API

Для использования [Database API](http://dev.bitshares.works/en/master/api/blockchain_api/database.html), необходимо использовать __BitShares.db__ объект.

Примеры методов из Database API:

[__get_objects(const vector <object_id_type> & ids) const__](http://dev.bitshares.works/en/master/api/blockchain_api/database.html#_CPPv3NK8graphene3app12database_api11get_objectsERK6vectorI14object_id_typeE)

[__list_assets(const string & lower_bound_symbol, uint32_t limit) const__](http://dev.bitshares.works/en/master/api/blockchain_api/database.html#_CPPv3NK8graphene3app12database_api11list_assetsERK6string8uint32_t)


Вызов этих методов:
```js
let obj = await BitShares.db.get_objects(["1.3.0"])
let bts = await BitShares.db.list_assets("BTS", 100)
```

#### History API

Для использования [Account History API](http://dev.bitshares.works/en/master/api/blockchain_api/history.html), необходимо использовать __BitShares.history__ объект.

Пример метода из Account History API:

[__get_account_history (account_id_type account, operation_history_id_type stop = operation_history_id_type (), unsigned limit = 100, operation_history_id_type start = operation_history_id_type ()) const__](http://dev.bitshares.works/en/master/api/blockchain_api/history.html#_CPPv3NK8graphene3app11history_api19get_account_historyEKNSt6stringE25operation_history_id_typej25operation_history_id_type)

Вызов метода:
```js
let ops = await BitShares.history.get_account_history("1.2.849826", "1.11.0", 10, "1.11.0")
```

### Приватный API

Если вам необходим доступ к операциям аккаунта, создайте объект класса `BitShares`. 

Если вы знаете `активный закрытый ключ`:
```js
let acc = new BitShares(<accountName>, <privateActiveKey>)
```
или если вы знаете `пароль`:
```js
let acc = BitShares.login(<accountName>, <password>)
```
или если у вас есть `bin`-файл:
```js
let buffer = fs.readFileSync(<bin-file path>);
let acc = BitShares.loginFromFile(buffer, <wallet-password>, <accountName>)
```

Созданный объект может производить следующие операции: покупка, продажа, перевод, отмена ордера, выпуск актива, сжигание актива и другое.

Сигнатуры методов:
```js
acc.buy(buySymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
acc.sell(sellSymbol, baseSymbol, amount, price, fill_or_kill = false, expire = "2020-02-02T02: 02: 02")
acc.cancelOrder(id)
acc.transfer(toName, assetSymbol, amount, memo)
acc.assetIssue(toName, assetSymbol, amount, memo)
acc.assetReserve(assetSymbol, amount)
```

Пример использования:
```js
await acc.buy("OPEN.BTC", "BTS", 0.002, 140000)
await acc.sell("BTS", "USD", 187, 0.24)
await acc.transfer("scientistnik", "BTS", 10)
await acc.assetIssue("scientistnik", "ABC", 10)
await acc.assetReserve("ABC", 12)
```

Если необходимо перевести токены с текстом, необходимо указать `закрытый memo-ключ`  (только если использовали `new BitShares()`):
```js
bot.setMemoKey(<privateMemoKey>)
await bot.transfer("scientistnik", "USD", 10, "Thank you for BTSDEX!")
```
### Конструктор транзакций

Каждая приватная транзакция считается принятой после включения в блок. Блоки создаются каждый 3 секунды. Если необходимо выполнить несколько операций, их последовательное выполнение может занять значительное время. К счастью, несколько операций могут быть включены в одну транзакцию. Для этого вам необходимо воспользоваться конструктором транзакций.

Для создания новой транзакции:
```js
let tx = BitShares.newTx([<activePrivateKey>,...])
```
или если у вас уже есть объект аккаунта `acc`:
```js
let tx = acc.newTx()
```

Для получения объектов операций:
```js
let operation1 = await acc.transferOperation("scientistnik", "BTS", 10)
let operation2 = await acc.assetIssueOperation("scientistnik", "ABC", 10)
...
```
Добавление операций в транзакцию:
```js
tx.add(operation1)
tx.add(operation2)
...
```
Можно узнать стоимость транзакций:
```js
let cost = await tx.cost()
console.log(cost) // { BTS: 1.234 }
```
После этого транзакцию можно отправлять:
```js
await tx.broadcast()
```
или
```js
await acc.broadcast(tx)
```

Операций доступные аккаунту в сети BitShares намного больше, чем доступно объекту класса `BitShares`. Если вы знаете какие поля для операции нужны, вы можете воспользоваться конструктором транзакций для отправки этой операции.

Пример создания нового аккаунта:
```js
let BitShares = require("btsdex")

BitShares.subscribe("connected", start)

async function start() {
  let acc = await BitShares.login(<accountName>, <password>)

  let params = {
    fee: {amount: 0, asset_id: "1.3.0"},
    name: "trade-bot3",
    registrar: "1.2.21058",
    referrer: "1.2.21058",
    referrer_percent: 5000,
    owner: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [[<ownerPublicKey>, 1]],
      address_auths: []
    },
    active: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [[<activePublicKey>, 1]],
      address_auths: []
    },
    options: {
      memo_key: <memoPublicKey>,
      voting_account: "1.2.5",
      num_witness: 0,
      num_committee: 0,
      votes: []
    },
    extensions: []
  };

  let tx = acc.newTx()
  tx.account_create(params) // 'account_create' это имя операции
  await tx.broadcast()
}
```


### Система событий

Очень часто мы должны ожидать, когда в блокчейне произойдут какое-то действие, на которое наша программа должна среагировать. Идея чтения каждого блока и просмотра всех операций в нем - неэффективна. Для этого лучше воспользоваться системой событий.

#### Типы событий

На данный момент, __BTSDEX__ содержит три типа событий:
* `connected` - срабатывет единожды, после подключения к блокчейну;
* `block` - срабатывает, когда новый блок создается в блокчейне;
* `account` - срабатывает, когда у заданного аккаунта изменяется баланс.

Для примера:
```js
const BitShares = require("btsdex");

BitShares.subscribe('connected', startAfterConnected);
BitShares.subscribe('block', callEachBlock);
BitShares.subscribe('account', changeAccount, 'trade-bot');

async function startAfterConnected() {/* вызовется один раз, после подключения к блокчейну */}
async function callEachBlock(obj) {/* вызовется каждый раз при создании нового блока */}
async function changeAccount(array) {/* вызовется при изменении баланса у аккаунта */}
```

##### Событие `connected`

Это событие срабатывает единожды, сразу после подключения к блокчейну. Если на него подписались несколько функций, все они будут вызваны.

```js
BitShares.subscribe('connected', firstFunction);
BitShares.subscribe('connected', secondFunction);
```

Другая особенность этого события заключается в том, что после первой подписки произойдет автоматический вызов `BitShares.connect()`. Если подключение уже установлено, повторного вызова не будет.

```js
const BitShares = require("btsdex");

BitShares.subscribe('connected', start);

async function start() {
  // код для работы с подключенным блокчейном
}
```

##### Событие `block`

Событие `block` срабатывает, когда в блокчейне создается новый блок. По аналогии с предыдущим событием, при первой подписке на это событие срабатывает подписка на событие `connected`, что приводит к автоматическому подключению к блокчейну.

```js
const BitShares = require("btsdex");

BitShares.subscribe('block', newBlock);

// необходимо подождать ~ 10-15 секунд
async function newBlock(obj) {
  console.log(obj); // [{id: '2.1.0', head_block_number: 17171083, time: ...}]
}
```

Как видно из примера, в подписавшиеся функции передается заголовок нового блока.

##### Событие `account`

Событие `account` срабатывает когда изменяется баланс у подписавшегося аккаунта. В изменения аккаунта входит:
* Если аккаунт отправил какой-либо токен
* Если аккаунт получил какой-либо токен
* Если аккаунт создал ордер
* Если ордер был исполнен (частично или полностью) или отменен.

Первая подписка на событие `account` приводит к автоматической подписке к событию `block`, что в конечном итоге приводит к подключению к блокчейну.

Пример кода:
```js
const BitShares = require("btsdex");

BitShares.subscribe('account', changeAccount, 'scientistnik');

async function changeAccount(array) {
  console.log(array); // [{id: '1.11.37843675', block_num: 17171423, op: ...}, {...}]
}
```

Во все подписанные функции передается массив объектов истории аккаунта с новыми событиями.

### REPL-режим

Если вы установили `btsdex`-пакет глобально, вам доступен скрипт `btsdex` для запуска из командной строки:
```js
$ btsdex
>|
```
Эта команда пытается подключиться к основной сети BitShares. Если надо подключиться к тестовой сети, попробуйте это:
```js
$ btsdex --testnet
>|
```
или воспользуйтесь ключом `--node`:
```js
$ btsdex --node wss://api.bts.blckchnd.com
>|
```

Данный режим представляет из себя простой nodejs REPL с предустановленными переменными:
- `BitShares`, главный класс пакета `BitShares`
- `login`, функция для создания объекта класса `BitShares`
- `generateKeys`, функция для генерации ключей по логину и паролю
- `accounts`, аналог `BitShares.accounts`
- `assets`, аналог `BitShares.assets`
- `db`, аналог `BitShares.db`
- `history`, аналог `BitShares.hostory`
- `network`, аналог `BitShares.network`
- `fees`, аналог `BitShares.fees`

#### Для примера

```js
$ btsdex
> assets["bts"].then(console.log)
```

#### Одноразовый запрос

Если необходиом сделать только один запрос, можно использовать `--account`, `--asset`, `--block`, `--object`, `--history` or `--transfer` ключи в командной строке:
```js
$ btsdex --account <'name' or 'id' or 'last number in id'>
{
  "id": "1.2.5992",
  "membership_expiration_date": "1970-01-01T00:00:00",
  "registrar": "1.2.37",
  "referrer": "1.2.21",
  ...
}
$ btsdex --asset <'symbol' or 'id' or 'last number in id'>
{
  "id": "1.3.0",
  "symbol": "BTS",
  "precision": 5,
  ...
}
$ btsdex --block [<number>]
block_num: 4636380
{
  "previous": "0046bedba1317d146dd6afbccff94412d76bf094",
  "timestamp": "2018-10-01T13:09:40",
  "witness": "1.6.41",
  ...
}
$ btsdex --object 1.2.3
{
  "id": "1.2.3",
  "membership_expiration_date": "1969-12-31T23:59:59",
  "registrar": "1.2.3",
  "referrer": "1.2.3",
  ...
}
$ btsdex --history <account> [<limit>] [<start>] [<stop>]
[
  {
    "id": "1.11.98179",
    "op": [
      0,
  ...
}]
$ btsdex --transfer <from> <to> <amount> <asset> [--key]
Transfered <amount> <asset> from '<from>' to '<to>' with memo '<memo>'
```

### Вспомогательные классы
Несколько вспомогательных классов для более удобной работы, такие как __BitShares.assets__ и __BitShares.accounts__:
```js
let usd = await BitShares.assets.usd;
let btc = await BitShares.assets["OPEN.BTS"];
let bts = await BitShares.assets["bts"];

let iam = await BitShares.accounts.scientistnik;
let tradebot = await BitShares.accounts["trade-bot"];
```
Такие запросы возвращают объекты со всеми полями, которые возвращает блокчейн.

### Примеры:

```js
const BitShares = require('btsdex')
KEY = 'privateActiveKey'

BitShares.subscribe('connected', startAfterConnected)

async function startAfterConnected() {
  let bot = new BitShares('trade-bot', KEY)

  let iam = await BitShares.accounts['trade-bot'];
  let orders = await BitShares.db.get_full_accounts([iam.id], false);
  
  orders = orders[0][1].limit_orders;
  let order = orders[0].sell_price;
  console.log(order)
}
```
## Документация
Для подробной информации смотрите [wiki](https://scientistnik.github.io/btsdex) или в `docs`-папке.

## Сотрудничество

О всех найденых багах или pull requests сообщайте на странице GitHub. Для личного общения, можно воспользоваться Telegram-каналом [btdex](https://t.me/btsdex).

`master`-ветка используется для новых релизов. Для создания нового функционала использутеся ветка `dev`. Пожалуйста, все pull requests адресуйте ветке `dev`.

## Лицензия

Данный пакет доступен как open source под [MIT лицензией](http://opensource.org/licenses/MIT).
