import type { Context, Next } from 'hono';
import { createHmac } from 'crypto';
import { InternalServerError, Unauthorized } from '../../middleware/error';

const LOVAT_SIGNING_KEY = process.env.LOVAT_SIGNING_KEY;

export async function requireLovatSignature(c: Context, next: Next) {
  if (!LOVAT_SIGNING_KEY) {
    console.error('LOVAT_SIGNING_KEY is not set');
    throw new InternalServerError('Server misconfiguration');
  }
  const signature = c.req.header('x-signature');
  const timestampStr = c.req.header('x-timestamp');
  const timestamp = timestampStr ? parseInt(timestampStr) : NaN;
  const { method, path } = c.req;

  const body = JSON.stringify(await c.req.json().catch(() => {})) || '';

  if (!signature || isNaN(timestamp)) {
    throw new Unauthorized('Missing or invalid signature/timestamp');
  }

  const timestampDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - timestampDate.getTime()) / 1000 / 60);
  if (diffMinutes > 5) throw new Unauthorized('Request timestamp is too old');

  const generatedSignature = createHmac('sha256', LOVAT_SIGNING_KEY)
    .update(JSON.stringify({ path, method, body, timestamp }))
    .digest('hex');

  if (signature === generatedSignature) {
    await next();
  } else {
    throw new Unauthorized('Invalid signature');
  }
}
