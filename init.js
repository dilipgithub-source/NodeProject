const startup = require("./db");
const redis = require("./redis");
const SUB_CHANNEL = "MechademyRedisChannel";
const handler = require("./handler");
let dbContext = null;

module.exports.init = (async () => {
  try {
    //connect to db
    dbContext = await startup();
    //subscribe to redis
    await redis().subscribe(SUB_CHANNEL);
    //event listner
    redis().on("message", async (channel, payload) => {
      if (SUB_CHANNEL === channel) {
        const parsedPayload = JSON.parse(payload);
        if (parsedPayload.channel == "HistoricalALgoChannel") {
          await handler.runSchematics(parsedPayload.event, dbContext);
        }
      }
    });
  } catch (e) {
    throw e;
  }
})();
