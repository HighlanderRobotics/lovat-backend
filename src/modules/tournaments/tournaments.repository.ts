import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import {
  registeredTeams,
  scouters,
  scouterScheduleShifts,
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
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
export type ShiftAssignments = Pick<
  ScouterShift,
  'team1' | 'team2' | 'team3' | 'team4' | 'team5' | 'team6'
>;
export type ShiftWrite = { startMatchOrdinalNumber: number; endMatchOrdinalNumber: number } & {
  [K in keyof ShiftAssignments]: string[];
};
export type ScheduleAccount = {
  teamNumber: number | null;
  role: 'ANALYST' | 'SCOUTING_LEAD';
  emailVerified: boolean | null;
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
  findScheduleAccount(userId: string): Promise<ScheduleAccount | null>;
  findShift(uuid: string): Promise<typeof scouterScheduleShifts.$inferSelect | null>;
  hasOverlappingShift(
    teamNumber: number,
    tournamentKey: string,
    start: number,
    end: number,
    excludeUuid?: string
  ): Promise<boolean>;
  findActiveScouterIds(teamNumber: number, ids: string[]): Promise<string[]>;
  createShift(teamNumber: number, tournamentKey: string, input: ShiftWrite): Promise<string>;
  updateShift(uuid: string, input: ShiftWrite): Promise<boolean>;
  deleteShift(uuid: string): Promise<boolean>;
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

    async findScheduleAccount(userId) {
      const [row] = await database
        .select({
          teamNumber: users.teamNumber,
          role: users.role,
          emailVerified: registeredTeams.emailVerified,
        })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return row ?? null;
    },
    async findShift(uuid) {
      const [row] = await database
        .select()
        .from(scouterScheduleShifts)
        .where(eq(scouterScheduleShifts.uuid, uuid))
        .limit(1);
      return row ?? null;
    },
    async hasOverlappingShift(teamNumber, tournamentKey, start, end, excludeUuid) {
      const predicates = [
        eq(scouterScheduleShifts.sourceTeamNumber, teamNumber),
        eq(scouterScheduleShifts.tournamentKey, tournamentKey),
        lte(scouterScheduleShifts.startMatchOrdinalNumber, end),
        gte(scouterScheduleShifts.endMatchOrdinalNumber, start),
      ];
      if (excludeUuid) predicates.push(ne(scouterScheduleShifts.uuid, excludeUuid));
      const [row] = await database
        .select({ uuid: scouterScheduleShifts.uuid })
        .from(scouterScheduleShifts)
        .where(and(...predicates))
        .limit(1);
      return row !== undefined;
    },
    async findActiveScouterIds(teamNumber, ids) {
      if (ids.length === 0) return [];
      return (
        await database
          .select({ uuid: scouters.uuid })
          .from(scouters)
          .where(
            and(
              eq(scouters.sourceTeamNumber, teamNumber),
              eq(scouters.archived, false),
              inArray(scouters.uuid, ids)
            )
          )
      ).map(({ uuid }) => uuid);
    },
    async createShift(teamNumber, tournamentKey, input) {
      return database.transaction(async (tx) => {
        const [shift] = await tx
          .insert(scouterScheduleShifts)
          .values({
            sourceTeamNumber: teamNumber,
            tournamentKey,
            startMatchOrdinalNumber: input.startMatchOrdinalNumber,
            endMatchOrdinalNumber: input.endMatchOrdinalNumber,
          })
          .returning({ uuid: scouterScheduleShifts.uuid });
        if (input.team1.length)
          await tx
            .insert(scouterScheduleShiftTeam1)
            .values(input.team1.map((A) => ({ A, B: shift.uuid })));
        if (input.team2.length)
          await tx
            .insert(scouterScheduleShiftTeam2)
            .values(input.team2.map((A) => ({ A, B: shift.uuid })));
        if (input.team3.length)
          await tx
            .insert(scouterScheduleShiftTeam3)
            .values(input.team3.map((A) => ({ A, B: shift.uuid })));
        if (input.team4.length)
          await tx
            .insert(scouterScheduleShiftTeam4)
            .values(input.team4.map((A) => ({ A, B: shift.uuid })));
        if (input.team5.length)
          await tx
            .insert(scouterScheduleShiftTeam5)
            .values(input.team5.map((A) => ({ A, B: shift.uuid })));
        if (input.team6.length)
          await tx
            .insert(scouterScheduleShiftTeam6)
            .values(input.team6.map((A) => ({ A, B: shift.uuid })));
        return shift.uuid;
      });
    },
    async updateShift(uuid, input) {
      return database.transaction(async (tx) => {
        const updated = await tx
          .update(scouterScheduleShifts)
          .set({
            startMatchOrdinalNumber: input.startMatchOrdinalNumber,
            endMatchOrdinalNumber: input.endMatchOrdinalNumber,
          })
          .where(eq(scouterScheduleShifts.uuid, uuid))
          .returning({ uuid: scouterScheduleShifts.uuid });
        if (!updated.length) return false;
        await Promise.all(
          [
            scouterScheduleShiftTeam1,
            scouterScheduleShiftTeam2,
            scouterScheduleShiftTeam3,
            scouterScheduleShiftTeam4,
            scouterScheduleShiftTeam5,
            scouterScheduleShiftTeam6,
          ].map((table) => tx.delete(table).where(eq(table.B, uuid)))
        );
        if (input.team1.length)
          await tx
            .insert(scouterScheduleShiftTeam1)
            .values(input.team1.map((A) => ({ A, B: uuid })));
        if (input.team2.length)
          await tx
            .insert(scouterScheduleShiftTeam2)
            .values(input.team2.map((A) => ({ A, B: uuid })));
        if (input.team3.length)
          await tx
            .insert(scouterScheduleShiftTeam3)
            .values(input.team3.map((A) => ({ A, B: uuid })));
        if (input.team4.length)
          await tx
            .insert(scouterScheduleShiftTeam4)
            .values(input.team4.map((A) => ({ A, B: uuid })));
        if (input.team5.length)
          await tx
            .insert(scouterScheduleShiftTeam5)
            .values(input.team5.map((A) => ({ A, B: uuid })));
        if (input.team6.length)
          await tx
            .insert(scouterScheduleShiftTeam6)
            .values(input.team6.map((A) => ({ A, B: uuid })));
        return true;
      });
    },
    async deleteShift(uuid) {
      return (
        (
          await database
            .delete(scouterScheduleShifts)
            .where(eq(scouterScheduleShifts.uuid, uuid))
            .returning({ uuid: scouterScheduleShifts.uuid })
        ).length > 0
      );
    },
  };
}
