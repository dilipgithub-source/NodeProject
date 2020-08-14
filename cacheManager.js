const _ = require("lodash");
const redis = require("./redis");
const ObjectId = require("mongodb").ObjectID;
// redis key prefix
const eqpRootCacheKeyPrefix = "EQPROOT_";

/**
 * Set root for given equipmentId.
 * @param {string} equipmentId
 * @param {Object} root
 */
async function setRoot(equipmentId, root) {
  // cache key
  const key = eqpRootCacheKeyPrefix + equipmentId;
  await redis().set(key, JSON.stringify(root));
  return true;
}

/**
 * get root for given equipmentId.
 * @param {string} equipmentId
 */
async function getRoot(dbContext, equipmentId) {
  // cache key
  const key = eqpRootCacheKeyPrefix + equipmentId;
  let root = await redis().get(key);
  // load if not found
  if (_.isNil(root)) {
    // save to redis if found
    const equipRoot = await dbContext
      .collection("schematics")
      .findOne(
        { equipment: ObjectId(equipmentId) },
        { projection: { root: 1 } }
      );
    if (equipRoot) {
      await setRoot(equipmentId, equipRoot["root"]);
      root = await redis().get(key);
    }
  }
  return JSON.parse(root);
}
/**
 * @type {getRoot}
 */
module.exports.getRoot = getRoot;

/**
 * Set equipmentId's.
 * @param {string} equipmentId
 * @param {Object} root
 */
async function setEquipmentIds(key, data) {
  // cache key
  await redis().set(key, JSON.stringify(data));
  return true;
}
/**
 * @type {setEquipmentIds}
 */
module.exports.setEquipmentIds = setEquipmentIds;
