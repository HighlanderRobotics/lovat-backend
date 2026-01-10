import { Context } from "hono";

export async function getTeam(c: Context) {
  return c.json({ ok: true });
}
