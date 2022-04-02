import {
  setLogger,
  connect,
  disconnect,
  setNotifyStatusCallback,
} from "../lib";

setLogger({ info: console.log, debug: console.log });

const servers = ["wss://dex.iobanker.com/ws", "wss://btsws.roelandp.nl/ws"],
  timeout = 5000,
  reconnectTimeout = 500;

describe("Connection", function () {
  describe("connect()", function () {
    afterEach(() => disconnect().catch(() => {}));

    it("without params", done => {
      connect()
        .then(() => {
          throw new Error("No error in the call without parameters");
        })
        .catch(() => done());
    });

    it("with one server", () => connect(servers[0]));
    it("with several servers", () => connect(servers));

    it("with timeout", function (done) {
      this.timeout(5000);
      connect(servers, 0, null)
        .then(() => {
          throw new Error("Timeout doesn't work");
        })
        .catch(() => done());
    });

    it.only("with reconnect timeout", function (done) {
      let countStatuses = 0;
      setNotifyStatusCallback(status => {
        status === "closed" && countStatuses++;

        if (countStatuses === 3) {
          countStatuses++;
          disconnect().then(done);
          return true;
        }

        return false;
      });
      connect(servers, 0, 100).catch(error => error);
    });

    it("call several times", done => {
      let p1 = connect(servers, timeout, reconnectTimeout);
      let p2 = connect(servers);
      let p3 = connect(servers);

      p1.catch(() => {});

      if (p1 === p2 && p2 === p3 && p1 === p3) done();
      else throw new Error("Different promises");
    });
  });

  describe("disconnect()", () => {
    before(() => connect(servers, timeout, 5000));

    it("disconnect two times", async () => {
      await disconnect();
      disconnect()
        .then(() => {
          throw new Error("No error on recall");
        })
        .catch(() => {});
    });
  });

  describe("common", () => {
    afterEach(disconnect);

    it("connect -> disconnect", async () => {
      let c = connect(servers, timeout, 5000);
      let d = disconnect();

      await c;
      await d;
    });
  });
});
