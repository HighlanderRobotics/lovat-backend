import type { MiddlewareHandler } from 'hono';
import { randomUUID } from 'node:crypto';
import type { AppEnvironment } from '../../app/context';

export function requestId(): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const value = context.req.header('x-request-id') ?? randomUUID();
    context.set('requestId', value);
    await next();
    context.header('x-request-id', value);
  };
}
