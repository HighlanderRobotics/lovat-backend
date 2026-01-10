import { Context } from "hono";

export async function sendNotification(c: Context) {
  return c.json({ ok: true });
}
