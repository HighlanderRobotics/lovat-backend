import { and, asc, desc, eq, lte, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import {
  registeredTeams,
  scoutReports,
  scouters,
  scouterScheduleShifts,
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
  teamMatchData,
  tournaments,
  users,
} from '../../platform/database/schema';

export type Scouter = typeof scouters.$inferSelect;
export type ScouterPublic = Pick<Scouter, 'uuid' | 'name' | 'archived'>;
export type RosterAccount = Pick<typeof users.$inferSelect, 'id' | 'role' | 'teamNumber'> & {
  emailVerified: boolean | null;
};
export type ScouterProgress = {
  scouterUuid: string;
  scouterName: string | null;
  matchesScouted: number;
  missedMatches: number;
};
export type ScouterReportSummary = {
  uuid: string;
  scouter: { name: string | null };
  teamMatchData: {
    teamNumber: number;
    key: string;
    matchNumber: number;
    matchType: 'QUALIFICATION' | 'ELIMINATION';
    tournament: { key: string; name: string };
  };
};

export interface ScoutersRepository {
  findAccount(userId: string): Promise<RosterAccount | null>;
  findById(uuid: string): Promise<Scouter | null>;
  list(teamNumber: number, archived?: boolean): Promise<ScouterPublic[]>;
  create(teamNumber: number, name: string): Promise<ScouterPublic>;
  update(
    uuid: string,
    changes: { name?: string; archived?: boolean }
  ): Promise<ScouterPublic | null>;
  findTeamNumberByCode(code: string): Promise<number | null>;
  progress(
    teamNumber: number,
    archived?: boolean,
    tournamentKey?: string
  ): Promise<ScouterProgress[]>;
  listReports(scouterUuid: string, tournamentKey?: string): Promise<ScouterReportSummary[]>;
}

const publicSelection = {
  uuid: scouters.uuid,
  name: scouters.name,
  archived: scouters.archived,
};

export function createScoutersRepository(database: Database): ScoutersRepository {
  return {
    async findAccount(userId) {
      const [account] = await database
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
      return account ?? null;
    },

    async findById(uuid) {
      const [scouter] = await database
        .select()
        .from(scouters)
        .where(eq(scouters.uuid, uuid))
        .limit(1);
      return scouter ?? null;
    },

    list(teamNumber, archived) {
      return database
        .select(publicSelection)
        .from(scouters)
        .where(
          archived === undefined
            ? eq(scouters.sourceTeamNumber, teamNumber)
            : and(eq(scouters.sourceTeamNumber, teamNumber), eq(scouters.archived, archived))
        )
        .orderBy(asc(scouters.archived), asc(scouters.name), asc(scouters.uuid));
    },

    async create(teamNumber, name) {
      const [scouter] = await database
        .insert(scouters)
        .values({ sourceTeamNumber: teamNumber, name })
        .returning(publicSelection);
      return scouter;
    },

    async update(uuid, changes) {
      const [scouter] = await database
        .update(scouters)
        .set(changes)
        .where(eq(scouters.uuid, uuid))
        .returning(publicSelection);
      return scouter ?? null;
    },
    async findTeamNumberByCode(code) {
      const [team] = await database
        .select({ number: registeredTeams.number })
        .from(registeredTeams)
        .where(eq(registeredTeams.code, code))
        .limit(1);
      return team?.number ?? null;
    },
    async progress(teamNumber, archived, tournamentKey) {
      const roster = await database
        .select({ uuid: scouters.uuid, name: scouters.name })
        .from(scouters)
        .where(
          archived === undefined
            ? eq(scouters.sourceTeamNumber, teamNumber)
            : and(eq(scouters.sourceTeamNumber, teamNumber), eq(scouters.archived, archived))
        )
        .orderBy(asc(scouters.name), asc(scouters.uuid));
      if (roster.length === 0) return [];
      const reportCounts = await database
        .select({
          scouterUuid: scoutReports.scouterUuid,
          count: sql<number>`count(distinct ${scoutReports.teamMatchKey})::int`,
        })
        .from(scoutReports)
        .innerJoin(teamMatchData, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .where(tournamentKey ? eq(teamMatchData.tournamentKey, tournamentKey) : undefined)
        .groupBy(scoutReports.scouterUuid);
      const scouted = new Map(reportCounts.map((row) => [row.scouterUuid, row.count]));
      if (!tournamentKey) {
        return roster.map(({ uuid, name }) => ({
          scouterUuid: uuid,
          scouterName: name,
          matchesScouted: scouted.get(uuid) ?? 0,
          missedMatches: 0,
        }));
      }
      const [matchCountRow] = await database
        .select({
          count: sql<number>`count(distinct (${teamMatchData.matchType}, ${teamMatchData.matchNumber}))::int`,
        })
        .from(teamMatchData)
        .innerJoin(scoutReports, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .where(eq(teamMatchData.tournamentKey, tournamentKey));
      const totalMatches = matchCountRow.count;
      const assignmentTables = [
        scouterScheduleShiftTeam1,
        scouterScheduleShiftTeam2,
        scouterScheduleShiftTeam3,
        scouterScheduleShiftTeam4,
        scouterScheduleShiftTeam5,
        scouterScheduleShiftTeam6,
      ] as const;
      const assignments = (
        await Promise.all(
          assignmentTables.map((table) =>
            database
              .select({
                scouterUuid: table.A,
                start: scouterScheduleShifts.startMatchOrdinalNumber,
                end: scouterScheduleShifts.endMatchOrdinalNumber,
              })
              .from(table)
              .innerJoin(scouterScheduleShifts, eq(table.B, scouterScheduleShifts.uuid))
              .where(
                and(
                  eq(scouterScheduleShifts.sourceTeamNumber, teamNumber),
                  eq(scouterScheduleShifts.tournamentKey, tournamentKey),
                  lte(scouterScheduleShifts.startMatchOrdinalNumber, totalMatches)
                )
              )
          )
        )
      ).flat();
      const assigned = new Map<string, number>();
      for (const assignment of assignments) {
        const count = Math.max(0, Math.min(assignment.end, totalMatches) - assignment.start + 1);
        assigned.set(assignment.scouterUuid, (assigned.get(assignment.scouterUuid) ?? 0) + count);
      }
      return roster.map(({ uuid, name }) => {
        const matchesScouted = scouted.get(uuid) ?? 0;
        return {
          scouterUuid: uuid,
          scouterName: name,
          matchesScouted,
          missedMatches: Math.max(0, (assigned.get(uuid) ?? 0) - matchesScouted),
        };
      });
    },
    async listReports(scouterUuid, tournamentKey) {
      const rows = await database
        .select({
          uuid: scoutReports.uuid,
          scouterName: scouters.name,
          teamNumber: teamMatchData.teamNumber,
          matchKey: teamMatchData.key,
          matchNumber: teamMatchData.matchNumber,
          matchType: teamMatchData.matchType,
          tournamentKey: tournaments.key,
          tournamentName: tournaments.name,
        })
        .from(scoutReports)
        .innerJoin(scouters, eq(scoutReports.scouterUuid, scouters.uuid))
        .innerJoin(teamMatchData, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .innerJoin(tournaments, eq(teamMatchData.tournamentKey, tournaments.key))
        .where(
          and(
            eq(scoutReports.scouterUuid, scouterUuid),
            tournamentKey ? eq(teamMatchData.tournamentKey, tournamentKey) : undefined
          )
        )
        .orderBy(
          desc(tournaments.date),
          desc(teamMatchData.matchType),
          desc(teamMatchData.matchNumber)
        );
      return rows.map((row) => ({
        uuid: row.uuid,
        scouter: { name: row.scouterName },
        teamMatchData: {
          teamNumber: row.teamNumber,
          key: row.matchKey,
          matchNumber: row.matchNumber,
          matchType: row.matchType,
          tournament: { key: row.tournamentKey, name: row.tournamentName },
        },
      }));
    },
  };
}
