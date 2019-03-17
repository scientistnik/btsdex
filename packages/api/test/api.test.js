import { setLogger, connect, disconnect, database, getConfig } from "../lib";

setLogger();

const server = "wss://eu.nodes.bitshares.ws";

describe("API", function() {
  describe("database", function() {
    before(() => connect(server));
    after(disconnect);

    it("coreAsset", done => {
      getConfig().coreAsset === "BTS" && done();
    });

    it("getObjects", async () => {
      if ((await database.getObjects(["2.0.0"]))[0].id !== "2.0.0")
        throw new Error("Expected object with id 2.0.0");
    });

    it("setSubscribeCallback", async () => {
      this.timeout(5000);
      await database.setSubscribeCallback(() => {}, false);
    });
  });
});
