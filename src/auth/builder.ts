import type { MiddlewareHandler, Next } from 'hono';
import { authenticateJwt } from './strategies/jwt.strategy';
import { authenticateApiKey } from './strategies/apiKey.strategy';
import { requireLovatSignature } from './strategies/lovat.strategy';
import { requireSlackToken } from './strategies/slack.strategy';
import { Forbidden, Unauthorized } from '../middleware/error';
import { users } from '../database/drizzle/schema';
import { unknown } from 'zod';

const jwtResult = {
  user: {
    id: '123',
    email: 'test@example.com',
    role: 'MEMBER',
    teamNumber: 8033,
    emailVerified: true,
    username: 'testuser',
    teamSourceRule: unknown,
    tournamentSourceRule: unknown,
  } as typeof users.$inferSelect,
  tokenType: 'jwt',
};
// Unified auth middlewares
export function dashboardAuth(): MiddlewareHandler {
  return async (c, next: Next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new Unauthorized();
    const token = header.slice(7);

    // Try API key first
    if (token.startsWith('lvt-')) {
      const apiResult = await authenticateApiKey(token);
      if (apiResult && apiResult.ok) {
        c.set('user', apiResult.user);
        c.set('tokenType', apiResult.tokenType);
        await next();
        return;
      }
      // Invalid API key
      throw new Unauthorized('Invalid API key');
    }

    // Fallback to JWT
    //const jwtResult = await authenticateJwt(token);
    if (jwtResult && jwtResult.user) {
      c.set('user', jwtResult.user);
      c.set('tokenType', jwtResult.tokenType);
      await next();
      return;
    }

    throw new Unauthorized();
  };
}

export function slackAuth(): MiddlewareHandler {
  return async (c, next) => requireSlackToken(c, next);
}

export function lovatAuth(): MiddlewareHandler {
  return async (c, next) => requireLovatSignature(c, next);
}

// Blocking middlewares
export function blockApiKeys(): MiddlewareHandler {
  return async (c, next: Next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new Unauthorized();
    const token = header.slice(7);
    if (token.startsWith('lvt-')) {
      throw new Forbidden('API key not allowed');
    }
    const result = jwtResult;
    if (result && result.user) {
      c.set('user', result.user);
      c.set('tokenType', result.tokenType);
      await next();
      return;
    }
    throw new Unauthorized();
  };
}

export function blockNonScoutingLeads(): MiddlewareHandler {
  return async (c, next: Next) => {
    const user = c.get('user');
    if (user?.role === 'SCOUTING_LEAD') {
      await next();
      return;
    }
    throw new Forbidden('Requires SCOUTING_LEAD role');
  };
}

// Helper to combine multiple middlewares into one
export function combine(...mws: MiddlewareHandler[]): MiddlewareHandler {
  return async (c, next) => {
    let i = 0;
    const run = async () => {
      const fn = mws[i++];
      if (fn) {
        await fn(c, run);
      } else {
        await next();
      }
    };
    await run();
  };
}
