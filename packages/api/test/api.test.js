import { setLogger, connect, disconnect, database, getConfig } from "../lib";

setLogger();

const server = "wss://btsws.roelandp.nl/ws";

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

    it("setSubscribeCallback", async function() {
      this.timeout(10000);

      return new Promise(async (resolve, reject) => {
        await database
          .setSubscribeCallback((...args) => {
            //console.log(JSON.stringify(args));
            resolve();
          }, false)
          .catch(reject);
        database.getObjects(["2.1.0"]);
      });
    });

    it("setBlockAppliedCallback", function() {
      this.timeout(5000);

      return new Promise(async resolve => {
        database.setBlockAppliedCallback(resolve);
      });
    });
  });
});
