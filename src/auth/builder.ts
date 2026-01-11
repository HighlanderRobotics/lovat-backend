import type { Next } from "hono";
import type { AuthenticatedRequestContext } from "./types";
import { authenticateApiKey } from "./strategies/apiKey.strategy";
import { authenticateJwt } from "./strategies/jwt.strategy";
import { requireLovatSignature } from "./strategies/lovat.strategy";
import { requireSlackToken } from "./strategies/slack.strategy";

// Authenticator builder class
export class AuthenticatorBuilder {
  private methods: Array<(c: AuthenticatedRequestContext, next: Next) => Promise<any>> = [];

  jwt() {
    this.methods.push(async (c, next) => {
      const header = c.req.header("authorization");
      if (!header?.startsWith("Bearer ")) return;

      const token = header.slice(7);
      const result = await authenticateJwt(token);
      if (result) {
        c.user = result.user;
        c.tokenType = result.tokenType;
        await next();
        return true;
      }
    });
    return this;
  }

  apiKey() {
    this.methods.push(async (c, next) => {
      const header = c.req.header("authorization");
      if (!header?.startsWith("Bearer ")) return;

      const token = header.slice(7);
      const result = await authenticateApiKey(token);

      if (!result) {
        return;
      } else if (result.ok === false) {
        return c.json({ message: "API key rate limit exceeded" }, 429);
      } else if (result.ok || result.user) {
        if (result.user) {
          c.user = result.user;
          c.tokenType = result.tokenType;
          
          await next();

          return true;
        }
      }
    });
    return this;
  }

  scoutingLead() {
    this.methods.push(async (c, next) => {
      if (c.user?.role === "SCOUTING_LEAD") {
        await next();
        return true;
      }
    });
    return this;
  }

  lovatSignature() {
    this.methods.push(requireLovatSignature);
    return this;
  }

  slackToken() {
    this.methods.push(requireSlackToken);
    return this;
  }

  build() {
    return async (c: AuthenticatedRequestContext, next: Next) => {
      for (const method of this.methods) {
        const handled = await method(c, next);
        if (handled) return; // stop at the first successful method
      }
      return c.text("Unauthorized", 401);
    };
  }
}

const auth = new AuthenticatorBuilder();
// Convenience function
export default auth;