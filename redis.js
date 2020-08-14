const Redis = require("ioredis");

// client instance holder
let redisClient = null;
const url = "redis://:foobared@localhost:6379/" //process.env.RedisURL;
/**
 * Get redis client instance.
 * @returns {Redis} redis client instance
 */
function redis() {
  // lazy init
  if (!redisClient) {
    redisClient = new Redis(url);
  }

  // return instance
  return redisClient;
}

/**
 * Redis instance accessor.
 * @type {redis}
 */
module.exports = redis;
