import {Apis} from "bitsharesjs-ws";

export default class Api {
  static new(api) {
    return new Proxy(Apis, new Api(api));
  }

  static getApis() {
    return Apis;
  }

  constructor(api) {
    this.api = api;
  }

  get(apis, name) {
    let api = this.api;

    return function() {
      //console.log(`api call: ${name}(${[...arguments]})`)
      return apis.instance()[api]().exec(name,[...arguments])
    }
  }
}