import { Context } from "hono";

export async function getPicklist(c: Context) {
  return c.json({ ok: true });
}
