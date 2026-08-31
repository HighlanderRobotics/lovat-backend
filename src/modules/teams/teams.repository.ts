import { asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { teams, users } from '../../platform/database/schema';

export type Team = typeof teams.$inferSelect;

export type TeamListOptions = {
  filter?: string;
  limit: number;
  offset: number;
  userTeamNumber: number | null;
};

export interface TeamsRepository {
  findUserTeamNumber(userId: string): Promise<number | null | undefined>;
  list(options: TeamListOptions): Promise<{ teams: Team[]; count: number }>;
}

export function createTeamsRepository(database: Database): TeamsRepository {
  return {
    async findUserTeamNumber(userId) {
      const [account] = await database
        .select({ teamNumber: users.teamNumber })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return account?.teamNumber;
    },

    async list({ filter, limit, offset, userTeamNumber }) {
      const pattern = `${filter ?? ''}%`;
      const where = filter
        ? or(sql`${teams.number}::text ilike ${pattern}`, ilike(teams.name, pattern))
        : undefined;
      const isUserTeam =
        userTeamNumber === null ? sql<boolean>`false` : eq(teams.number, userTeamNumber);

      const [rows, [total]] = await Promise.all([
        database
          .select({ number: teams.number, name: teams.name })
          .from(teams)
          .where(where)
          .orderBy(desc(isUserTeam), asc(teams.number))
          .limit(limit)
          .offset(offset),
        database.select({ value: count() }).from(teams).where(where),
      ]);
      return { teams: rows, count: total.value };
    },
  };
}
