import redis from '../database/redis/client';

export async function invalidateDependency(dependency: string) {
  const reverseKey = `cache:rev:${dependency}`;

  const keys = await redis.smembers(reverseKey);

  if (!keys.length) return;

  const pipeline = redis.pipeline();

  for (const key of keys) {
    pipeline.del(key);
    pipeline.del(`cache:deps:${key}`);
    pipeline.srem(reverseKey, key);
  }

  await pipeline.exec();
}

export const invalidate = {
  team: (n: number) => invalidateDependency(`team:${n}`),

  tournament: (k: string) => invalidateDependency(`tournament:${k}`),

  user: (id: string) => invalidateDependency(`user:${id}`),
};
