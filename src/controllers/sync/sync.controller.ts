import { Context } from "hono";

export async function startSync(c: Context) {
  return c.json({ ok: true });
}
