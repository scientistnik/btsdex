function call(obj,name) {
  return function() {
    console.log(`api call: ${name}(${[...arguments]})`)
    return obj.exec(name,[...arguments])
  }
}

export default function(obj) {
  return new Proxy(obj,{get: call})
}