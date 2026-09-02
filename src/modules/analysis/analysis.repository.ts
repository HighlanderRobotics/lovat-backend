import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import {
  events,
  scoutReports,
  scouters,
  teamMatchData,
  teams,
  tournaments,
  users,
} from '../../platform/database/schema';

export type AnalysisAccount = Pick<
  typeof users.$inferSelect,
  'id' | 'teamNumber' | 'teamSourceRule' | 'tournamentSourceRule'
>;
export type AnalysisReport = Pick<
  typeof scoutReports.$inferSelect,
  | 'uuid'
  | 'accuracy'
  | 'autoClimb'
  | 'beached'
  | 'disrupts'
  | 'driverAbility'
  | 'defenseEffectiveness'
  | 'endgameClimb'
  | 'feederTypes'
  | 'fieldTraversal'
  | 'intakeType'
  | 'robotRoles'
  | 'scoresWhileMoving'
> & {
  matchKey: string;
  tournamentKey: string;
  tournamentDate: string | null;
  matchType: 'QUALIFICATION' | 'ELIMINATION';
  matchNumber: number;
  tournamentName: string;
  sourceTeamNumber: number;
  scouterName: string | null;
  events: (typeof events.$inferSelect)[];
};

export interface AnalysisRepository {
  findAccount(userId: string): Promise<AnalysisAccount | null>;
  teamExists(teamNumber: number): Promise<boolean>;
  countTeamReports(teamNumber: number): Promise<number>;
  listTeamReports(teamNumber: number, account: AnalysisAccount): Promise<AnalysisReport[]>;
  listAllReports(account: AnalysisAccount): Promise<AnalysisReport[]>;
  lastReportedQualification(tournamentKey: string): Promise<number | null>;
}

function teamSourceFilter(rule: AnalysisAccount['teamSourceRule']) {
  if (rule.items.length === 0) return rule.mode === 'INCLUDE' ? sql`false` : undefined;
  return rule.mode === 'INCLUDE'
    ? inArray(scouters.sourceTeamNumber, rule.items)
    : notInArray(scouters.sourceTeamNumber, rule.items);
}

function tournamentSourceFilter(rule: AnalysisAccount['tournamentSourceRule']) {
  if (rule.items.length === 0) return rule.mode === 'INCLUDE' ? sql`false` : undefined;
  return rule.mode === 'INCLUDE'
    ? inArray(teamMatchData.tournamentKey, rule.items)
    : notInArray(teamMatchData.tournamentKey, rule.items);
}

export function createAnalysisRepository(database: Database): AnalysisRepository {
  async function listReports(teamNumber: number | null, account: AnalysisAccount) {
    const rows = await database
      .select({
        uuid: scoutReports.uuid,
        accuracy: scoutReports.accuracy,
        autoClimb: scoutReports.autoClimb,
        beached: scoutReports.beached,
        disrupts: scoutReports.disrupts,
        driverAbility: scoutReports.driverAbility,
        defenseEffectiveness: scoutReports.defenseEffectiveness,
        endgameClimb: scoutReports.endgameClimb,
        feederTypes: scoutReports.feederTypes,
        fieldTraversal: scoutReports.fieldTraversal,
        intakeType: scoutReports.intakeType,
        robotRoles: scoutReports.robotRoles,
        scoresWhileMoving: scoutReports.scoresWhileMoving,
        matchKey: teamMatchData.key,
        tournamentKey: teamMatchData.tournamentKey,
        tournamentDate: tournaments.date,
        matchType: teamMatchData.matchType,
        matchNumber: teamMatchData.matchNumber,
        tournamentName: tournaments.name,
        sourceTeamNumber: scouters.sourceTeamNumber,
        scouterName: scouters.name,
      })
      .from(scoutReports)
      .innerJoin(scouters, eq(scoutReports.scouterUuid, scouters.uuid))
      .innerJoin(teamMatchData, eq(scoutReports.teamMatchKey, teamMatchData.key))
      .innerJoin(tournaments, eq(teamMatchData.tournamentKey, tournaments.key))
      .where(
        and(
          teamNumber === null ? undefined : eq(teamMatchData.teamNumber, teamNumber),
          teamSourceFilter(account.teamSourceRule),
          tournamentSourceFilter(account.tournamentSourceRule)
        )
      )
      .orderBy(
        asc(tournaments.date),
        asc(teamMatchData.matchType),
        asc(teamMatchData.matchNumber),
        asc(scoutReports.uuid)
      );
    if (rows.length === 0) return [];
    const eventRows = await database
      .select()
      .from(events)
      .where(
        inArray(
          events.scoutReportUuid,
          rows.map(({ uuid }) => uuid)
        )
      )
      .orderBy(asc(events.time));
    const eventsByReport = Map.groupBy(eventRows, (event) => event.scoutReportUuid);
    return rows.map((row) => ({ ...row, events: eventsByReport.get(row.uuid) ?? [] }));
  }
  return {
    async findAccount(userId) {
      const [row] = await database
        .select({
          id: users.id,
          teamNumber: users.teamNumber,
          teamSourceRule: users.teamSourceRule,
          tournamentSourceRule: users.tournamentSourceRule,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return row ?? null;
    },
    async teamExists(teamNumber) {
      const [row] = await database
        .select({ number: teams.number })
        .from(teams)
        .where(eq(teams.number, teamNumber))
        .limit(1);
      return row !== undefined;
    },
    async countTeamReports(teamNumber) {
      const [row] = await database
        .select({ value: sql<number>`count(*)::int` })
        .from(scoutReports)
        .innerJoin(teamMatchData, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .where(eq(teamMatchData.teamNumber, teamNumber));
      return row.value;
    },
    async listTeamReports(teamNumber, account) {
      return listReports(teamNumber, account);
    },
    listAllReports(account) {
      return listReports(null, account);
    },
    async lastReportedQualification(tournamentKey) {
      const [row] = await database
        .select({ value: sql<number | null>`max(${teamMatchData.matchNumber})::int` })
        .from(teamMatchData)
        .innerJoin(scoutReports, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .where(
          and(
            eq(teamMatchData.tournamentKey, tournamentKey),
            eq(teamMatchData.matchType, 'QUALIFICATION')
          )
        );
      return row.value;
    },
  };
}
