// const Redis = require("ioredis");

// const redis = new Redis({
//   host: "127.0.0.1", // Redis ka host (localhost)
//   port: 6379,        // Redis ka default port
// });

// redis.on("connect", () => {
//   console.log("✅ Redis Connected");
// });

// redis.on("error", (err) => {
//   console.error("❌ Redis Error:", err);
// });



const Redis = require("ioredis");

let redisInstance = null; // Singleton instance

function getRedisInstance() {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: "127.0.0.1",
      port: 6379,
    });

    redisInstance.on("connect", () => {
      console.log("✅ Redis Connected");
    });

    redisInstance.on("error", (err) => {
      console.error("❌ Redis Error:", err);
    });
  }
  return redisInstance;
}

module.exports = getRedisInstance();
