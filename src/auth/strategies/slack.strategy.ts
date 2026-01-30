import type { Context, Next } from 'hono';
import { Forbidden, Unauthorized, InternalServerError } from '../../middleware/error';

export async function requireSlackToken(c: Context, next: Next) {
  try {
    const signature = c.req.header('x-slack-signature');
    const timestampStr = c.req.header('x-slack-request-timestamp');
    const body = await c.req.json().catch(() => ({}));
    const verificationKey = body.token;

    const timestamp = timestampStr ? parseInt(timestampStr) : NaN;

    if (body.challenge) {
      return c.text(body.challenge, 200);
    }

    if (!signature || isNaN(timestamp)) {
      throw new Unauthorized('Missing signature or timestamp');
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 60 * 5) {
      throw new Unauthorized('Stale request');
    }

    if (body.api_app_id !== process.env.SLACK_APP_ID) {
      throw new Unauthorized('Invalid Slack App ID');
    }

    if (verificationKey !== process.env.SLACK_VERIFICATION_KEY) {
      throw new Unauthorized('Invalid verification token');
    }

    await next();
  } catch (error) {
    console.error('Slack verification error:', error);
    if (error instanceof Unauthorized || error instanceof Forbidden) throw error;
    throw new InternalServerError('Error verifying Slack request');
  }
}
