import { MiddlewareHandler } from 'hono';
import { sha256 } from 'hono/utils/crypto';

export const etag: MiddlewareHandler = async (c, next) => {
  await next();

  if (!c.res.ok) return;
  if (c.req.method !== 'GET') return;

  const body = await c.res.clone().text();
  const newEtag = await sha256(body);

  const ifNoneMatch = c.req.header('If-None-Match');

  if (ifNoneMatch === newEtag) {
    return c.body(null, 304, {
      ETag: newEtag,
    });
  }

  c.res.headers.set('ETag', newEtag ?? '0');
};
