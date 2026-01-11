import type { MiddlewareHandler, Next } from 'hono';
import { authenticateJwt } from './strategies/jwt.strategy';
import { requireLovatSignature } from './strategies/lovat.strategy';
import { requireSlackToken } from './strategies/slack.strategy';

export const auth = {
  noApiKey(): MiddlewareHandler {
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
  },

  scoutingLead(): MiddlewareHandler {
    return async (c, next: Next) => {
      const user = c.get('user');
      if (user?.role === 'SCOUTING_LEAD') {
        await next();
        return;
      }
      return c.text('Unauthorized', 401);
    };
  },

  lovatSignature(): MiddlewareHandler {
    return async (c, next) => requireLovatSignature(c, next);
  },

  slackToken(): MiddlewareHandler {
    return async (c, next) => requireSlackToken(c, next);
  },

  check() {
    const chain: MiddlewareHandler[] = [];

    const runChain: MiddlewareHandler = async (c, next) => {
      let i = 0;
      const dispatch = async () => {
        const fn = chain[i++];
        if (fn) {
          await fn(c, dispatch);
        } else {
          await next();
        }
      };
      await dispatch();
    };

    const composer: any = runChain;

    composer.noApiKey = () => {
      chain.push(auth.noApiKey());
      return composer;
    };
    composer.scoutingLead = () => {
      chain.push(auth.scoutingLead());
      return composer;
    };
    composer.lovatSignature = () => {
      chain.push(auth.lovatSignature());
      return composer;
    };
    composer.slackToken = () => {
      chain.push(auth.slackToken());
      return composer;
    };
    composer.handlers = () => chain;

    return composer as MiddlewareHandler & {
      noApiKey: () => typeof composer;
      scoutingLead: () => typeof composer;
      lovatSignature: () => typeof composer;
      slackToken: () => typeof composer;
      handlers: () => MiddlewareHandler[];
    };
  },
};
