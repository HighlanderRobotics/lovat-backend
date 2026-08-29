import * as jose from 'jose';
import { z } from 'zod';
import type { Authenticator } from '../../platform/auth/types';
import type { AccountsRepository } from '../../modules/accounts';

const Auth0ProfileSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
});

export function createAuth0Authenticator(
  domain: string,
  audience: string,
  accounts: AccountsRepository
): Authenticator {
  const issuer = `https://${domain}/`;
  const keySet = jose.createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

  return {
    async authenticate(token) {
      let subject: string;
      try {
        const { payload } = await jose.jwtVerify(token, keySet, {
          issuer,
          audience,
        });
        if (!payload.sub) {
          return null;
        }
        subject = payload.sub;
      } catch {
        return null;
      }

      let account = await accounts.findById(subject);
      if (!account) {
        const response = await globalThis.fetch(`${issuer}userinfo`, {
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          return null;
        }

        const profile = Auth0ProfileSchema.parse(await response.json());
        if (profile.sub !== subject) {
          return null;
        }

        account = await accounts.upsertFromAuth0({
          id: profile.sub,
          email: profile.email,
          emailVerified: profile.email_verified,
        });
      }

      return {
        userId: account.id,
        role: account.role,
        tokenType: 'jwt',
      };
    },
  };
}
