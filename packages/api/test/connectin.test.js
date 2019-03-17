import { setLogger, connect, disconnect } from "../lib";

setLogger();

const servers = [
    "wss://eu.nodes.bitshares.ws",
    "wss://bitshares.openledger.info/ws"
  ],
  timeout = 5000;

describe("Connection", function() {
  describe("connect()", () => {
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

    it("with timeout", done => {
      connect(
        servers,
        0,
        false
      )
        .then(() => {
          throw new Error("");
        })
        .catch(() => done());
    });

    it("call several times", done => {
      let p1 = connect(
        servers,
        timeout,
        false
      );
      let p2 = connect(servers);
      let p3 = connect(servers);

      p1.catch(() => {});

      if (p1 === p2 && p2 === p3 && p1 === p3) done();
      else throw new Error("Different promises");
    });
  });

  describe("disconnect()", () => {
    before(() =>
      connect(
        servers,
        timeout,
        false
      )
    );

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
      let c = connect(
        servers,
        timeout,
        false
      );
      let d = disconnect();

      await c;
      await d;
    });
  });
});
