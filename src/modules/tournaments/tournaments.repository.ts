import { asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import {
  registeredTeams,
  teamMatchData,
  teams,
  tournaments,
  users,
} from '../../platform/database/schema';

export type Tournament = typeof tournaments.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type TournamentSummary = Tournament & { isParticipant: boolean };
export type AssignedScouter = { uuid: string; name: string | null };
export type ScouterShift = {
  uuid: string;
  startMatchOrdinalNumber: number;
  endMatchOrdinalNumber: number;
  team1: AssignedScouter[];
  team2: AssignedScouter[];
  team3: AssignedScouter[];
  team4: AssignedScouter[];
  team5: AssignedScouter[];
  team6: AssignedScouter[];
};

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
  findVerifiedUserTeamNumber(userId: string): Promise<number | null>;
  listScouterShifts(teamNumber: number, tournamentKey: string): Promise<ScouterShift[]>;
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

    async findVerifiedUserTeamNumber(userId) {
      const [account] = await database
        .select({ teamNumber: users.teamNumber, emailVerified: registeredTeams.emailVerified })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return account?.teamNumber !== null && account?.emailVerified === true
        ? (account?.teamNumber ?? null)
        : null;
    },

    async listScouterShifts(teamNumber, tournamentKey) {
      const rows = await database.query.scouterScheduleShifts.findMany({
        where: (shift, { and, eq }) =>
          and(eq(shift.sourceTeamNumber, teamNumber), eq(shift.tournamentKey, tournamentKey)),
        orderBy: (shift, { asc }) => [asc(shift.startMatchOrdinalNumber)],
        with: {
          team1Assignments: { with: { scouter: true } },
          team2Assignments: { with: { scouter: true } },
          team3Assignments: { with: { scouter: true } },
          team4Assignments: { with: { scouter: true } },
          team5Assignments: { with: { scouter: true } },
          team6Assignments: { with: { scouter: true } },
        },
      });
      return rows.map((shift) => ({
        uuid: shift.uuid,
        startMatchOrdinalNumber: shift.startMatchOrdinalNumber,
        endMatchOrdinalNumber: shift.endMatchOrdinalNumber,
        team1: shift.team1Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
        team2: shift.team2Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
        team3: shift.team3Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
        team4: shift.team4Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
        team5: shift.team5Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
        team6: shift.team6Assignments.map(({ scouter }) => ({
          uuid: scouter.uuid,
          name: scouter.name,
        })),
      }));
    },
  };
}
