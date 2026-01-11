import redis from './../../database/redis/client';

export async function rateLimitApiKey(keyHash: string): Promise<boolean> {
  const redisKey = `auth:apikey:${keyHash}:rate`;

  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, 3);

  return count <= 1;
}
