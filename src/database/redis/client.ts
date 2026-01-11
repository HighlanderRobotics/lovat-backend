import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableOfflineQueue: true, // queue commands if Redis is down temporarily
});

redis.on("connect", () => console.log("Redis connected"));
redis.on("error", (err) => console.error("Redis error", err));

export default redis;