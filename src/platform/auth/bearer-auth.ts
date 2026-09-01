import type { MiddlewareHandler } from 'hono';
import type { AppEnvironment } from '../../app/context';
import { Forbidden, Unauthorized } from '../http/errors';
import type { Authenticator } from './types';

export function bearerAuth(authenticator: Authenticator): MiddlewareHandler<AppEnvironment> {
  return async (context, next) => {
    const authorization = context.req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) throw new Unauthorized();
    const token = authorization.slice('Bearer '.length);
    if (!token) throw new Unauthorized();
    const identity = await authenticator.authenticate(token);
    if (!identity) throw new Unauthorized('Invalid authorization token');
    context.set('auth', identity);
    await next();
  };
}

export function assertDashboardIdentity(identity: AppEnvironment['Variables']['auth']) {
  if (identity.tokenType !== 'jwt')
    throw new Forbidden('This action cannot be performed using an API key');
}
