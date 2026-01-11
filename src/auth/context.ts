import { authenticateApiKey } from "./strategies/apiKey.strategy";
import { authenticateJwt } from "./strategies/jwt.strategy";
import type { AuthenticatedRequestContext } from "./types";
import type { Next } from "hono";

export async function requireAuth(c: AuthenticatedRequestContext, next: Next) {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) return c.text("Unauthorized", 401);

  const token = header.slice(7);

  const apiKeyResult = await authenticateApiKey(token);

  if (apiKeyResult?.ok === false)
    return c.json({ message: "API key rate limit exceeded" }, 429);

  const result = apiKeyResult?.ok ? apiKeyResult : await authenticateJwt(token);

  if (!result || !result.user) return c.text("Unauthorized", 401);

  c.user = result.user;
  c.tokenType = result.tokenType;

  await next();
}
