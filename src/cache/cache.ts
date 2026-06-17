import redis from '../database/redis/client';

export const DEFAULT_CACHE_TTL = 60 * 60 * 24 * 7;

export interface CacheableFunction<TContext, TArgs, TResult> {
  key: (ctx: TContext, args: TArgs) => string;

  dependencies?: (ctx: TContext, args: TArgs) => string[] | Promise<string[]>;

  ttl?: number;

  compute: (ctx: TContext, args: TArgs) => Promise<TResult>;
}

export function defineCacheable<TContext, TArgs, TResult>(
  config: CacheableFunction<TContext, TArgs, TResult>
) {
  return config;
}

export interface CacheOptions {
  bypassRead?: boolean;
  bypassWrite?: boolean;
}

function cacheKey(key: string) {
  return `cache:${key}`;
}

function dependencyKey(key: string) {
  return `cache:deps:${key}`;
}

function reverseDependencyKey(dep: string) {
  return `cache:rev:${dep}`;
}

export async function runCached<TContext, TArgs, TResult>(
  fn: CacheableFunction<TContext, TArgs, TResult>,
  ctx: TContext,
  args: TArgs,
  options?: CacheOptions
): Promise<TResult> {
  const rawKey = fn.key(ctx, args);
  const key = cacheKey(rawKey);

  if (!options?.bypassRead) {
    const hit = await redis.get(key);

    if (hit) {
      try {
        return JSON.parse(hit) as TResult;
      } catch {
        await redis.del(key);
        await redis.del(dependencyKey(key));
      }
    }
  }

  const dependencies = (await fn.dependencies?.(ctx, args)) ?? [];

  const result = await fn.compute(ctx, args);

  if (options?.bypassWrite) {
    return result;
  }

  const ttl = fn.ttl ?? DEFAULT_CACHE_TTL;

  const pipeline = redis.pipeline();

  pipeline.setex(key, ttl, JSON.stringify(result));

  pipeline.setex(dependencyKey(key), ttl, JSON.stringify(dependencies));

  for (const dep of dependencies) {
    const reverseKey = reverseDependencyKey(dep);

    pipeline.sadd(reverseKey, key);

    pipeline.expire(reverseKey, ttl);
  }

  await pipeline.exec();

  return result;
}
