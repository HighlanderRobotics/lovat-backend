import redis from '../database/redis/client';

export async function invalidate(dep: string) {
  const keys = await redis.smembers(`rev:${dep}`);

  if (!keys.length) return;

  const pipeline = redis.multi();

  for (const key of keys) {
    pipeline.del(key);
    pipeline.del(`deps:${key}`);
  }

  pipeline.del(`rev:${dep}`);

  await pipeline.exec();
}
