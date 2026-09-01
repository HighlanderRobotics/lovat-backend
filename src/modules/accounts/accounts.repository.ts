import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { featureToggles, registeredTeams, users } from '../../platform/database/schema';

export type Account = typeof users.$inferSelect;
export type AccountRole = Account['role'];
export type RegisteredTeam = typeof registeredTeams.$inferSelect;

export type Auth0Profile = {
  id: string;
  email: string;
  emailVerified: boolean;
};

export interface AccountsRepository {
  findById(id: string): Promise<Account | null>;
  upsertFromAuth0(profile: Auth0Profile): Promise<Account>;
  deleteById(id: string): Promise<boolean>;
  updateSettings(
    id: string,
    settings: Pick<Account, 'username' | 'teamSourceRule' | 'tournamentSourceRule'>
  ): Promise<Account | null>;
  isTeamVerified(teamNumber: number): Promise<boolean>;
  listTeamMembers(teamNumber: number, role?: AccountRole): Promise<Account[]>;
  updateRole(id: string, role: AccountRole): Promise<Account | null>;
  findRegisteredTeam(teamNumber: number): Promise<RegisteredTeam | null>;
  updateTeamWebsite(teamNumber: number, website: string | null): Promise<RegisteredTeam | null>;
  findRegisteredTeamByCode(code: string): Promise<RegisteredTeam | null>;
  isFeatureEnabled(feature: string): Promise<boolean>;
  listTeamUserIds(teamNumber: number): Promise<string[]>;
  createRegistration(input: {
    userId: string;
    number: number;
    email: string;
    code: string;
    teamApproved: boolean;
  }): Promise<RegisteredTeam>;
  joinTeam(userId: string, teamNumber: number): Promise<Account | null>;
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

    async updateSettings(id, settings) {
      const [account] = await database
        .update(users)
        .set(settings)
        .where(eq(users.id, id))
        .returning();
      return account ?? null;
    },
    async isTeamVerified(teamNumber) {
      const [team] = await database
        .select({ verified: registeredTeams.emailVerified })
        .from(registeredTeams)
        .where(eq(registeredTeams.number, teamNumber))
        .limit(1);
      return team?.verified === true;
    },
    listTeamMembers(teamNumber, role) {
      return database
        .select()
        .from(users)
        .where(and(eq(users.teamNumber, teamNumber), role ? eq(users.role, role) : undefined))
        .orderBy(asc(users.username), asc(users.email));
    },
    async updateRole(id, role) {
      const [account] = await database
        .update(users)
        .set({ role })
        .where(eq(users.id, id))
        .returning();
      return account ?? null;
    },
    async findRegisteredTeam(teamNumber) {
      const [team] = await database
        .select()
        .from(registeredTeams)
        .where(eq(registeredTeams.number, teamNumber))
        .limit(1);
      return team ?? null;
    },
    async updateTeamWebsite(teamNumber, website) {
      const [team] = await database
        .update(registeredTeams)
        .set({ website })
        .where(eq(registeredTeams.number, teamNumber))
        .returning();
      return team ?? null;
    },
    async findRegisteredTeamByCode(code) {
      const [team] = await database
        .select()
        .from(registeredTeams)
        .where(eq(registeredTeams.code, code))
        .limit(1);
      return team ?? null;
    },
    async isFeatureEnabled(feature) {
      const [toggle] = await database
        .select({ enabled: featureToggles.enabled })
        .from(featureToggles)
        .where(eq(featureToggles.feature, feature))
        .limit(1);
      return toggle?.enabled ?? true;
    },
    async listTeamUserIds(teamNumber) {
      return (
        await database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.teamNumber, teamNumber))
          .orderBy(asc(users.id))
      ).map(({ id }) => id);
    },
    createRegistration(input) {
      return database.transaction(async (transaction) => {
        const [team] = await transaction
          .insert(registeredTeams)
          .values({
            number: input.number,
            email: input.email,
            code: input.code,
            teamApproved: input.teamApproved,
          })
          .returning();
        await transaction
          .update(users)
          .set({ teamNumber: input.number, role: 'SCOUTING_LEAD' })
          .where(eq(users.id, input.userId));
        return team;
      });
    },
    async joinTeam(userId, teamNumber) {
      const [account] = await database
        .update(users)
        .set({ teamNumber })
        .where(eq(users.id, userId))
        .returning();
      return account ?? null;
    },
  };
}
