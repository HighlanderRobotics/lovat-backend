import { eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { users } from '../../platform/database/schema';

export type Account = typeof users.$inferSelect;
export type AccountRole = Account['role'];

export type Auth0Profile = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export interface AccountsRepository {
  findById(id: string): Promise<Account | null>;
  upsertFromAuth0(profile: Auth0Profile): Promise<Account>;
  deleteById(id: string): Promise<boolean>;
}

export function createAccountsRepository(database: Database): AccountsRepository {
  return {
    async findById(id) {
      const [account] = await database.select().from(users).where(eq(users.id, id)).limit(1);
      return account ?? null;
    },

    async upsertFromAuth0(profile) {
      const [account] = await database
        .insert(users)
        .values({
          id: profile.id,
          email: profile.email,
          emailVerified: profile.emailVerified,
          role: 'ANALYST',
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: profile.email,
            emailVerified: profile.emailVerified,
          },
        })
        .returning();

      return account;
    },

    async deleteById(id) {
      const deleted = await database
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id });
      return deleted.length > 0;
    },
  };
}
