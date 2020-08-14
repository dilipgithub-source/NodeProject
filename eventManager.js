const cacheManager = require("./cacheManager");
const SQS = require("./sqs");
const _ = require("lodash");
const ObjectID = require("mongodb").ObjectID;
/**
 *
 * @param {Object} dbContext
 */
async function processSchematics(event, dbContext) {
  //console.log("plantbatchtimes start", Date.now());
  //get time interval
  const timeInterval = await dbContext
    .collection("plantbatchtimes")
    .findOne({ to: event.to, from: event.from, status: "start" });
  //console.log("plantbatchtimes end", Date.now());
  //get all timestamp from db
  let timestamp = [];
  if (timeInterval) {
    // console.log("timestamp start", Date.now());
    timestamp = await dbContext
      .collection("schedules")
      .find({
        status: 0,
        time: { $gte: timeInterval.from, $lte: timeInterval.to }
      })
      .toArray();
    // console.log("timestamp end", Date.now());

    //also set that interval to inprocess
    // console.log("plantbatchtimes update start", Date.now());

    await dbContext
      .collection("plantbatchtimes")
      .updateOne({ _id: timeInterval._id }, { $set: { status: "inprogress" } });

    //console.log("plantbatchtimes update end", Date.now());
    //trigger up all the schematic for given timestamp
    if (!timestamp.length) {
      console.log("got timestamps");

      //console.log("all schematic get start", Date.now());
      //get all schematics from db
      //map objects ids
      const objectIds = event.equipments.map(function(eqp) {
        return ObjectID(eqp);
      });
      const allSchematic = await dbContext
        .collection("schematics")
        .find(
          { equipment: { $in: objectIds } },
          { projection: { equipment: 1 } }
        )
        .toArray();
      // console.log("all schematic get end", Date.now());

      const equipmentId = _.map(allSchematic, "equipment");

      const key = `${timeInterval.from}_${timeInterval.to}`;
      // save to redis
      //console.log("updatind cache", Date.now());
      await cacheManager.setEquipmentIds(key, equipmentId);
      // console.log("updatind end", Date.now());

      console.log("allSchematic", allSchematic);
      if (allSchematic.length) {
        console.log("got schematics");

        //create mapping for equipment processor
        const equipmentProcessor = [];
        _.forEach(allSchematic, s => {
          _.forEach(timestamp, t => {
            equipmentProcessor.push({
              equipmentId: s.equipment,
              time: t.time,
              isProcessed: false
            });
          });
        });

        //add timestamp to equipment and marked isprocess false
        // console.log("insert eqprocessor start", Date.now());
        await dbContext
          .collection("equipmentprocessors")
          .insertMany(equipmentProcessor);
        //console.log("insert eqprocessor end", Date.now());
        //run schematic for each time stramp
        const promisedTimeStamp = timestamp.map(async timeInfo => {
          //update schedules collection for given time
          // console.log(
          //   "update schedule start",
          //   ` ${Date.now()}_${timeInfo.time}`
          // );
          await dbContext
            .collection("schedules")
            .updateOne({ time: timeInfo.time }, { $set: { status: 1 } });
          // console.log("update schedule end", ` ${Date.now()}_${timeInfo.time}`);
          //run all schematic to corresponding timestamp
          await Promise.all(
            allSchematic.map(async schematic => {
              //get root node of schematic from redis
              const root = await cacheManager.getRoot(
                dbContext,
                schematic.equipment
              );
              //prepare params
              const message = {
                componentId: root["ComponentId"],
                componentType: root["ComponentType"],
                equipmentId: schematic.equipment,
                time: timeInfo.time,
                from: timeInterval.from,
                to: timeInterval.to
              };
              //console.log("message", message);
              let QueueUrl = "";
              switch (message.componentType) {
                case "Compressors":
                  QueueUrl = process.env.CompSQS;
                  break;
                case "Liquid expanders":
                  QueueUrl = process.env.LeSQS;
                  break;
                case "Pumps":
                  QueueUrl = process.env.PumpSQS;
                  break;
                case "Mixers/Splitters":
                  QueueUrl = process.env.MixSQS;
                  break;
                case "Electric motors":
                  QueueUrl = process.env.MotorSQS;
              }
              const params = {
                QueueUrl: QueueUrl,
                MessageBody: JSON.stringify(message)
              };
              // console.log(
              //   "SQS start",
              //   ` ${Date.now()}_${timeInfo.time}_${schematic.equipment}`
              // );
              //enqueue message
              await SQS.sendMessage(params);
              // console.log(
              //   "SQS end",
              //   ` ${Date.now()}_${timeInfo.time}_${schematic.equipment}`
              // );
            })
          );
        });
        //  console.log("All promise",Date.now())
        //wait for completion of all timestamp
        await Promise.all(promisedTimeStamp);
        // console.log("All promise end",Date.now())
      }
    }
  }
}

module.exports.processSchematics = processSchematics;
