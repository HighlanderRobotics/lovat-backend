import redis from '../database/redis/client';

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  deps: string[] = []
): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);

  const value = await fn();

  await redis.setex(key, 60 * 60 * 24 * 7, JSON.stringify(value));

  if (deps.length) {
    await redis.set(`deps:${key}`, JSON.stringify(deps));

    for (const dep of deps) {
      await redis.sadd(`rev:${dep}`, key);
    }
  }

  return value;
}
