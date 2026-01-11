import { createHash } from "crypto";
import { db } from "../../database/drizzle/client"; // relative path to your Drizzle client
import { apiKeys, users } from "../../database/drizzle/schema";
import { eq } from "drizzle-orm";
import { rateLimitApiKey } from "../utils/rateLimit";

export async function authenticateApiKey(token: string) {
  if (!token.startsWith("lvt-")) return null;

  const keyHash = createHash("sha256").update(token).digest("hex");

  const allowed = await rateLimitApiKey(keyHash);
  if (!allowed) return { ok: false, reason: "RATE_LIMITED" };

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash));

  if (!key) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, key.userId));

  if (!user) return null;

  return { ok: true as const, user, tokenType: "apiKey" as const };
}
