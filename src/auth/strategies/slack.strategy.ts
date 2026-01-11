import type { Context, Next } from 'hono';

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
      return c.text('Unauthorized', 401);
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 60 * 5) {
      return c.text('Stale request', 401);
    }

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
