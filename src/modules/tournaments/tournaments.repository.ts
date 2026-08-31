import { asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { teamMatchData, teams, tournaments, users } from '../../platform/database/schema';

export type Tournament = typeof tournaments.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TournamentSummary = Tournament & { isParticipant: boolean };

export type TournamentListOptions = {
  filter?: string;
  limit: number;
  offset: number;
  teamNumber: number | null;
};

export interface TournamentsRepository {
  findUserTeamNumber(userId: string): Promise<number | null | undefined>;
  list(
    options: TournamentListOptions
  ): Promise<{ tournaments: TournamentSummary[]; count: number }>;
  exists(key: string): Promise<boolean>;
  listTeams(key: string): Promise<Team[]>;
}

export function createTournamentsRepository(database: Database): TournamentsRepository {
  return {
    async findUserTeamNumber(userId) {
      const [account] = await database
        .select({ teamNumber: users.teamNumber })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return account?.teamNumber;
    },

    async list({ filter, limit, offset, teamNumber }) {
      const where = filter
        ? or(ilike(tournaments.key, `%${filter}%`), ilike(tournaments.name, `%${filter}%`))
        : undefined;
      const isParticipant =
        teamNumber === null
          ? sql<boolean>`false`
          : sql<boolean>`exists (
              select 1
              from ${teamMatchData}
              where ${teamMatchData.tournamentKey} = ${tournaments.key}
                and ${teamMatchData.teamNumber} = ${teamNumber}
            )`;

      const [rows, [total]] = await Promise.all([
        database
          .select({
            key: tournaments.key,
            name: tournaments.name,
            location: tournaments.location,
            date: tournaments.date,
            latestFetchETag: tournaments.latestFetchETag,
            isParticipant,
          })
          .from(tournaments)
          .where(where)
          .orderBy(desc(isParticipant), asc(tournaments.date), asc(tournaments.key))
          .limit(limit)
          .offset(offset),
        database.select({ value: count() }).from(tournaments).where(where),
      ]);

      return { tournaments: rows, count: total.value };
    },

    async exists(key) {
      const [tournament] = await database
        .select({ key: tournaments.key })
        .from(tournaments)
        .where(eq(tournaments.key, key))
        .limit(1);
      return tournament !== undefined;
    },

    listTeams(key) {
      return database
        .selectDistinct({ number: teams.number, name: teams.name })
        .from(teamMatchData)
        .innerJoin(teams, eq(teamMatchData.teamNumber, teams.number))
        .where(eq(teamMatchData.tournamentKey, key))
        .orderBy(asc(teams.number));
    },
  };
}
