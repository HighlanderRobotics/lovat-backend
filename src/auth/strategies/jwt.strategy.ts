import axios from "axios";
import * as jose from "jose";
import { db } from "../../database/drizzle/client";
import { users } from "../../database/drizzle/schema";
import { eq } from "drizzle-orm";

const JWKS = jose.createRemoteJWKSet(
  new URL(`https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`)
);

export async function authenticateJwt(token: string) {
  let payload;
  try {
    ({ payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      audience: "https://api.lovat.app",
    }));
  } catch {
    return null;
  }

  const userId = payload.sub!;
  let [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user) {
    const { data } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    user = await db
      .insert(users)
      .values({
        id: userId,
        email: data.email,
        emailVerified: data.email_verified,
        role: "ANALYST",
      })
      .returning()
      .then(r => r[0]);
  }

  return { user, tokenType: "jwt" as const };
}
