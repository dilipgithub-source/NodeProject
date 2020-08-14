"use strict";
const _ = require("lodash");
const eventManger = require("./eventManager");
module.exports.runSchematics = async (event, dbContext) => {
  console.log("In lambda");
  //wait for startup
  try {
    if (event) {
      console.log("Event recieved");
      await eventManger.processSchematics(event, dbContext);
    }
  } catch (e) {
    console.log("error", e);
    throw new Error("Error", e);
  }
};
