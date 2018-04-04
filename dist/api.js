function call(obj, name) {
  return function () {
    return obj.exec(name, [...arguments]);
  };
}

export default function (obj) {
  return new Proxy(obj, {
    get: call
  });
}