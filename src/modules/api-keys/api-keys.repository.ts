import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { apiKeys, registeredTeams, users } from '../../platform/database/schema';

export type ApiKeyRecord = typeof apiKeys.$inferSelect;
export type ApiKeyOwner = Pick<typeof users.$inferSelect, 'id' | 'role' | 'teamNumber'> & {
  emailVerified: boolean | null;
};
export type ApiKeyWithUsername = Omit<ApiKeyRecord, 'keyHash' | 'userId'> & {
  username: string | null;
};
export type ApiKeyWithOwner = ApiKeyRecord & { owner: ApiKeyOwner };

export interface ApiKeysRepository {
  findOwner(userId: string): Promise<ApiKeyOwner | null>;
  findById(uuid: string): Promise<ApiKeyWithOwner | null>;
  listByUser(userId: string): Promise<ApiKeyWithUsername[]>;
  listByTeam(teamNumber: number): Promise<ApiKeyWithUsername[]>;
  create(input: { keyHash: string; name: string; userId: string }): Promise<void>;
  rename(uuid: string, name: string): Promise<boolean>;
  delete(uuid: string): Promise<boolean>;
}

const publicKeySelection = {
  uuid: apiKeys.uuid,
  name: apiKeys.name,
  createdAt: apiKeys.createdAt,
  lastUsed: apiKeys.lastUsed,
  requests: apiKeys.requests,
  username: users.username,
};

export function createApiKeysRepository(database: Database): ApiKeysRepository {
  return {
    async findOwner(userId) {
      const [owner] = await database
        .select({
          id: users.id,
          role: users.role,
          teamNumber: users.teamNumber,
          emailVerified: registeredTeams.emailVerified,
        })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return owner ?? null;
    },

    async findById(uuid) {
      const [key] = await database
        .select({
          uuid: apiKeys.uuid,
          keyHash: apiKeys.keyHash,
          name: apiKeys.name,
          userId: apiKeys.userId,
          createdAt: apiKeys.createdAt,
          lastUsed: apiKeys.lastUsed,
          requests: apiKeys.requests,
          owner: {
            id: users.id,
            role: users.role,
            teamNumber: users.teamNumber,
            emailVerified: registeredTeams.emailVerified,
          },
        })
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(apiKeys.uuid, uuid))
        .limit(1);
      return key ?? null;
    },

    listByUser(userId) {
      return database
        .select(publicKeySelection)
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(eq(apiKeys.userId, userId))
        .orderBy(desc(apiKeys.createdAt));
    },

    listByTeam(teamNumber) {
      return database
        .select(publicKeySelection)
        .from(apiKeys)
        .innerJoin(users, eq(apiKeys.userId, users.id))
        .where(eq(users.teamNumber, teamNumber))
        .orderBy(desc(apiKeys.createdAt));
    },

    async create(input) {
      await database.insert(apiKeys).values(input);
    },

    async rename(uuid, name) {
      const renamed = await database
        .update(apiKeys)
        .set({ name })
        .where(eq(apiKeys.uuid, uuid))
        .returning({ uuid: apiKeys.uuid });
      return renamed.length > 0;
    },

    async delete(uuid) {
      const deleted = await database
        .delete(apiKeys)
        .where(eq(apiKeys.uuid, uuid))
        .returning({ uuid: apiKeys.uuid });
      return deleted.length > 0;
    },
  };
}
