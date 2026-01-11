import type { AuthenticatedRequestContext } from '../types';
import type { Next } from 'hono';
import { createHmac } from 'crypto';

const LOVAT_SIGNING_KEY = process.env.LOVAT_SIGNING_KEY;

export async function requireLovatSignature(c: AuthenticatedRequestContext, next: Next) {
  if (!LOVAT_SIGNING_KEY) {
    console.error('LOVAT_SIGNING_KEY is not set');
    return c.text('Server misconfiguration', 500);
  }
  const signature = c.req.header('x-signature');
  const timestampStr = c.req.header('x-timestamp');
  const timestamp = timestampStr ? parseInt(timestampStr) : NaN;
  const { method, path } = c.req;

  const body = JSON.stringify(await c.req.json().catch(() => {})) || '';

  if (!signature || isNaN(timestamp)) {
    return c.text('Unauthorized', 401);
  }

  // Check if timestamp is within 5 minutes
  const timestampDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - timestampDate.getTime()) / 1000 / 60);
  if (diffMinutes > 5) return c.text('Unauthorized', 401);

  const generatedSignature = createHmac('sha256', LOVAT_SIGNING_KEY)
    .update(JSON.stringify({ path, method, body, timestamp }))
    .digest('hex');

  if (signature === generatedSignature) {
    await next();
  } else {
    return c.text('Unauthorized', 401);
  }
}
