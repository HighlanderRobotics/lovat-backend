import type { Next } from 'hono';
import { requireSlackToken } from './strategies/slack.strategy';
import { requireLovatSignature } from './strategies/lovat.strategy';

export async function requireAuth(c: any, next: Next) {
  // First try Slack token verification
  let ok = false;
  await requireSlackToken(c as any, async () => {
    ok = true;
  });
  if (ok) return await next();

  // Then try Lovat signature verification
  ok = false;
  await requireLovatSignature(c as any, async () => {
    ok = true;
  });
  if (ok) return await next();

  return c.text('Unauthorized', 401);
}
