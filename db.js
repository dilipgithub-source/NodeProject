const MongoClient = require("mongodb").MongoClient;
const utils = require("util");
let client = null;
const url = "mongodb://localhost:27017/mechademydb"; //process.env.MongoURL;
module.exports = async () => {
  console.log("In init db");
  //lazy init
  if (!client) {
    const promisedClient = utils.promisify(MongoClient.connect)(url);

    const session = await promisedClient;
    client = session.db(process.env.Db);
  }
  return client;
};
