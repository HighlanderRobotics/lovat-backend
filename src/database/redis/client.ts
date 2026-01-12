import Redis from 'ioredis';

let redis: Redis;

if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
  redis = new Redis({
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
} else {
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    tls: process.env.REDIS_TLS ? {} : undefined, // optional
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
  });
}

redis.on('connect', () => console.log('Redis connected'));

export default redis;
