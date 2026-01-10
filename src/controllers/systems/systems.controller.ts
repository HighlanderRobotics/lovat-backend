import { Context } from "hono";

export async function getSystemStatus(c: Context) {
  return c.json({ ok: true });
}
