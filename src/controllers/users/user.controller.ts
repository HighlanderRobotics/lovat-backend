import { Context } from "hono";

export async function getUser(c: Context) {
  return c.json({ ok: true });
}
