import type { MiddlewareHandler, Next } from 'hono';
import { authenticateJwt } from './strategies/jwt.strategy';
import { authenticateApiKey } from './strategies/apiKey.strategy';
import { requireLovatSignature } from './strategies/lovat.strategy';
import { requireSlackToken } from './strategies/slack.strategy';

// Unified auth middlewares
export function dashboardAuth(): MiddlewareHandler {
  return async (c, next: Next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) return c.text('Unauthorized', 401);
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
      return c.text('Unauthorized', 401);
    }

    // Fallback to JWT
    const jwtResult = await authenticateJwt(token);
    if (jwtResult && jwtResult.user) {
      c.set('user', jwtResult.user);
      c.set('tokenType', jwtResult.tokenType);
      await next();
      return;
    }

    return c.text('Unauthorized', 401);
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
    if (!header?.startsWith('Bearer ')) return c.text('Unauthorized', 401);
    const token = header.slice(7);
    if (token.startsWith('lvt-')) {
      return c.text('Unauthorized: API key not allowed', 401);
    }
    const result = await authenticateJwt(token);
    if (result && result.user) {
      c.set('user', result.user);
      c.set('tokenType', result.tokenType);
      await next();
      return;
    }
    return c.text('Unauthorized', 401);
  };
}

export function blockNonScoutingLeads(): MiddlewareHandler {
  return async (c, next: Next) => {
    const user = c.get('user');
    if (user?.role === 'SCOUTING_LEAD') {
      await next();
      return;
    }
    return c.text('Unauthorized', 401);
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
