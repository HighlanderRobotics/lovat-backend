import { and, asc, eq, or, sql } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import {
  cachedAnalyses,
  events,
  registeredTeams,
  scouters,
  scoutReports,
  teamMatchData,
  users,
} from '../../platform/database/schema';

export type ScoutReport = typeof scoutReports.$inferSelect;
export type ScoutEvent = typeof events.$inferSelect;
export type ScoutReportAccount = Pick<typeof users.$inferSelect, 'id' | 'teamNumber' | 'role'> & {
  teamVerified: boolean;
};
export type ScoutReportRecord = ScoutReport & {
  scouterName: string | null;
  sourceTeamNumber: number;
  teamNumber: number;
  tournamentKey: string;
};
export type MatchScoutReportSummary = Pick<
  ScoutReport,
  'uuid' | 'scouterUuid' | 'notes' | 'startTime' | 'robotBrokeDescription'
> & {
  scouterName: string | null;
  sourceTeamNumber: number;
};

export interface ScoutReportsRepository {
  findAccount(userId: string): Promise<ScoutReportAccount | null>;
  findScouter(uuid: string): Promise<{ uuid: string; sourceTeamNumber: number } | null>;
  findMatch(input: {
    tournamentKey: string;
    matchType: 'QUALIFICATION' | 'ELIMINATION';
    matchNumber: number;
    teamNumber: number;
  }): Promise<{ key: string; tournamentKey: string; teamNumber: number } | null>;
  findReport(uuid: string): Promise<ScoutReportRecord | null>;
  listEvents(uuid: string, ordered?: boolean): Promise<ScoutEvent[]>;
  listForMatch(teamMatchKey: string): Promise<MatchScoutReportSummary[]>;
  create(
    report: typeof scoutReports.$inferInsert,
    eventRows: (typeof events.$inferInsert)[],
    dependency: { teamNumber: number; tournamentKey: string }
  ): Promise<ScoutReport>;
  updateNotes(
    uuid: string,
    notes: string,
    dependency: { teamNumber: number; tournamentKey: string }
  ): Promise<ScoutReport | null>;
  delete(uuid: string, dependency: { teamNumber: number; tournamentKey: string }): Promise<boolean>;
}

function invalidate(
  database: Pick<Database, 'delete'>,
  dependency: { teamNumber: number; tournamentKey: string }
) {
  return database
    .delete(cachedAnalyses)
    .where(
      or(
        sql`${dependency.teamNumber} = ANY(${cachedAnalyses.teamDependencies})`,
        sql`${dependency.tournamentKey} = ANY(${cachedAnalyses.tournamentDependencies})`
      )
    );
}

export function createScoutReportsRepository(database: Database): ScoutReportsRepository {
  return {
    async findAccount(userId) {
      const [row] = await database
        .select({
          id: users.id,
          teamNumber: users.teamNumber,
          role: users.role,
          teamVerified: registeredTeams.emailVerified,
        })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return row ? { ...row, teamVerified: row.teamVerified === true } : null;
    },
    async findScouter(uuid) {
      const [row] = await database
        .select({ uuid: scouters.uuid, sourceTeamNumber: scouters.sourceTeamNumber })
        .from(scouters)
        .where(eq(scouters.uuid, uuid))
        .limit(1);
      return row ?? null;
    },
    async findMatch(input) {
      const [row] = await database
        .select({
          key: teamMatchData.key,
          tournamentKey: teamMatchData.tournamentKey,
          teamNumber: teamMatchData.teamNumber,
        })
        .from(teamMatchData)
        .where(
          and(
            eq(teamMatchData.tournamentKey, input.tournamentKey),
            eq(teamMatchData.matchType, input.matchType),
            eq(teamMatchData.matchNumber, input.matchNumber),
            eq(teamMatchData.teamNumber, input.teamNumber)
          )
        )
        .limit(1);
      return row ?? null;
    },
    async findReport(uuid) {
      const [row] = await database
        .select({
          uuid: scoutReports.uuid,
          teamMatchKey: scoutReports.teamMatchKey,
          startTime: scoutReports.startTime,
          notes: scoutReports.notes,
          robotRoles: scoutReports.robotRoles,
          driverAbility: scoutReports.driverAbility,
          scouterUuid: scoutReports.scouterUuid,
          robotBrokeDescription: scoutReports.robotBrokeDescription,
          accuracy: scoutReports.accuracy,
          beached: scoutReports.beached,
          climbPosition: scoutReports.climbPosition,
          climbSide: scoutReports.climbSide,
          defenseEffectiveness: scoutReports.defenseEffectiveness,
          feederTypes: scoutReports.feederTypes,
          intakeType: scoutReports.intakeType,
          fieldTraversal: scoutReports.fieldTraversal,
          scoresWhileMoving: scoutReports.scoresWhileMoving,
          disrupts: scoutReports.disrupts,
          endgameClimb: scoutReports.endgameClimb,
          autoClimb: scoutReports.autoClimb,
          scouterName: scouters.name,
          sourceTeamNumber: scouters.sourceTeamNumber,
          teamNumber: teamMatchData.teamNumber,
          tournamentKey: teamMatchData.tournamentKey,
        })
        .from(scoutReports)
        .innerJoin(scouters, eq(scoutReports.scouterUuid, scouters.uuid))
        .innerJoin(teamMatchData, eq(scoutReports.teamMatchKey, teamMatchData.key))
        .where(eq(scoutReports.uuid, uuid))
        .limit(1);
      return row ?? null;
    },
    listEvents(uuid, ordered = false) {
      const query = database.select().from(events).where(eq(events.scoutReportUuid, uuid));
      return ordered ? query.orderBy(asc(events.time)) : query;
    },
    listForMatch(teamMatchKey) {
      return database
        .select({
          uuid: scoutReports.uuid,
          scouterUuid: scoutReports.scouterUuid,
          notes: scoutReports.notes,
          startTime: scoutReports.startTime,
          robotBrokeDescription: scoutReports.robotBrokeDescription,
          scouterName: scouters.name,
          sourceTeamNumber: scouters.sourceTeamNumber,
        })
        .from(scoutReports)
        .innerJoin(scouters, eq(scoutReports.scouterUuid, scouters.uuid))
        .where(eq(scoutReports.teamMatchKey, teamMatchKey))
        .orderBy(asc(scoutReports.startTime), asc(scoutReports.uuid));
    },
    create(report, eventRows, dependency) {
      return database.transaction(async (transaction) => {
        const [created] = await transaction.insert(scoutReports).values(report).returning();
        if (eventRows.length > 0) await transaction.insert(events).values(eventRows);
        await invalidate(transaction, dependency);
        return created;
      });
    },
    updateNotes(uuid, notes, dependency) {
      return database.transaction(async (transaction) => {
        const [updated] = await transaction
          .update(scoutReports)
          .set({ notes })
          .where(eq(scoutReports.uuid, uuid))
          .returning();
        if (updated) await invalidate(transaction, dependency);
        return updated ?? null;
      });
    },
    delete(uuid, dependency) {
      return database.transaction(async (transaction) => {
        const deleted = await transaction
          .delete(scoutReports)
          .where(eq(scoutReports.uuid, uuid))
          .returning({ uuid: scoutReports.uuid });
        if (deleted.length > 0) await invalidate(transaction, dependency);
        return deleted.length > 0;
      });
    },
  };
}
