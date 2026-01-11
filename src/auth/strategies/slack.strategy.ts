import type { AuthenticatedRequestContext } from '../types';
import type { Next } from 'hono';

/**
 * Hono middleware to verify Slack requests.
 * Supports URL verification (challenge) and token validation.
 */
export async function requireSlackToken(c: AuthenticatedRequestContext, next: Next) {
  try {
    const signature = c.req.header('x-slack-signature');
    const timestampStr = c.req.header('x-slack-request-timestamp');
    const verificationKey = (await c.req.json()).token; // Slack sends token in JSON body

    const timestamp = timestampStr ? parseInt(timestampStr) : NaN;

    const body = await c.req.json().catch(() => ({}));

    // Slack URL verification
    if (body.challenge) {
      return c.text(body.challenge, 200);
    }

    // Check required headers
    if (!signature || isNaN(timestamp)) {
      return c.text('Unauthorized', 401);
    }

    // Check timestamp within 5 min
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 60 * 5) {
      return c.text('Stale request', 401);
    }

    // Check app ID / verification token
    if (body.api_app_id !== process.env.SLACK_APP_ID) {
      return c.text('Unauthorized', 401);
    }

    if (verificationKey !== process.env.SLACK_VERIFICATION_KEY) {
      return c.text('Unauthorized', 401);
    }

    await next();
  } catch (error) {
    console.error('Slack verification error:', error);
    return c.text('Internal server error verifying Slack request', 500);
  }
}
