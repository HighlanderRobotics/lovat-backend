import { describe, expect, it } from 'bun:test';
import { OpenAPIHono } from '@hono/zod-openapi';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  allianceColor,
  apiKeys,
  autoClimb,
  beached,
  cachedAnalyses,
  climbPosition,
  climbSide,
  dataFetches,
  emailVerificationRequests,
  endgameClimb,
  eventAction,
  events,
  feederType,
  featureToggles,
  fieldTraversal,
  intakeType,
  matches,
  matchParticipants,
  matchType,
  matchVideos,
  mutablePicklists,
  officialAllianceBreakdowns,
  position,
  registeredTeams,
  robotRole,
  scouters,
  scouterScheduleShifts,
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
  scoutReports,
  sharedPicklists,
  slackNotificationThreads,
  slackSubscriptions,
  slackWorkspaces,
  teamMatchData,
  teams,
  tournaments,
  userRole,
  users,
  warningType,
} from '.';
import {
  EventInsertSchema,
  MatchSchema,
  ScoutReportInsertSchema,
  TeamSourceRuleSchema,
  UserInsertSchema,
  UserRoleSchema,
} from '../schemas';

const modelTables = [
  events,
  featureToggles,
  matches,
  matchParticipants,
  officialAllianceBreakdowns,
  matchVideos,
  teamMatchData,
  mutablePicklists,
  scoutReports,
  scouterScheduleShifts,
  scouters,
  sharedPicklists,
  teams,
  registeredTeams,
  emailVerificationRequests,
  slackWorkspaces,
  slackSubscriptions,
  slackNotificationThreads,
  tournaments,
  users,
  apiKeys,
  cachedAnalyses,
  dataFetches,
];

const implicitJoinTables = [
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
];

describe('database schema parity', () => {
  it('contains every Prisma model and implicit join table', () => {
    expect(modelTables.map(getTableName)).toEqual([
      'Event',
      'FeatureToggle',
      'Match',
      'MatchParticipant',
      'OfficialAllianceBreakdown',
      'MatchVideo',
      'TeamMatchData',
      'MutablePicklist',
      'ScoutReport',
      'ScouterScheduleShift',
      'Scouter',
      'SharedPicklist',
      'Team',
      'RegisteredTeam',
      'EmailVerificationRequest',
      'SlackWorkspace',
      'SlackSubscription',
      'SlackNotificationThread',
      'Tournament',
      'User',
      'ApiKey',
      'CachedAnalysis',
      'DataFetch',
    ]);
    expect(implicitJoinTables.map(getTableName)).toEqual([
      '_Team1',
      '_Team2',
      '_Team3',
      '_Team4',
      '_Team5',
      '_Team6',
    ]);
  });

  it('preserves all Prisma enum values', () => {
    expect(allianceColor.enumValues).toEqual(['RED', 'BLUE']);
    expect(position.enumValues).toHaveLength(9);
    expect(eventAction.enumValues).toHaveLength(14);
    expect(fieldTraversal.enumValues).toEqual(['TRENCH', 'BUMP', 'BOTH', 'NONE']);
    expect(beached.enumValues).toEqual(['ON_FUEL', 'ON_BUMP', 'BOTH', 'NEITHER']);
    expect(endgameClimb.enumValues).toEqual(['NOT_ATTEMPTED', 'FAILED', 'L1', 'L2', 'L3']);
    expect(climbPosition.enumValues).toEqual(['SIDE', 'MIDDLE']);
    expect(climbSide.enumValues).toEqual(['FRONT', 'BACK']);
    expect(autoClimb.enumValues).toEqual(['NOT_ATTEMPTED', 'FAILED', 'SUCCEEDED']);
    expect(feederType.enumValues).toEqual(['CONTINUOUS', 'STOP_TO_SHOOT', 'DUMP']);
    expect(intakeType.enumValues).toEqual(['GROUND', 'OUTPOST', 'BOTH', 'NEITHER']);
    expect(robotRole.enumValues).toEqual([
      'CYCLING',
      'SCORING',
      'FEEDING',
      'DEFENDING',
      'IMMOBILE',
    ]);
    expect(warningType.enumValues).toEqual(['BREAK']);
    expect(userRole.enumValues).toEqual(['ANALYST', 'SCOUTING_LEAD']);
    expect(matchType.enumValues).toEqual(['QUALIFICATION', 'ELIMINATION']);
  });

  it('preserves critical foreign keys and indexes', () => {
    expect(getTableConfig(scoutReports).foreignKeys).toHaveLength(2);
    expect(getTableConfig(events).foreignKeys).toHaveLength(1);
    expect(getTableConfig(matchParticipants).primaryKeys).toHaveLength(1);
    expect(getTableConfig(matchParticipants).uniqueConstraints).toHaveLength(1);

    for (const assignment of implicitJoinTables) {
      const config = getTableConfig(assignment);
      expect(config.foreignKeys).toHaveLength(2);
      expect(config.indexes).toHaveLength(2);
    }
  });
});

describe('Drizzle-derived Zod and OpenAPI schemas', () => {
  it('makes database-generated UUIDs optional on inserts', () => {
    const report = ScoutReportInsertSchema.safeParse({
      teamMatchKey: '2026cafr_qm1_8033',
      startTime: new Date(),
      notes: '',
      robotRoles: ['SCORING'],
      driverAbility: 4,
      scouterUuid: '00000000-0000-4000-8000-000000000001',
      beached: 'NEITHER',
      defenseEffectiveness: 0,
      feederTypes: [],
      intakeType: 'GROUND',
      fieldTraversal: 'TRENCH',
      scoresWhileMoving: true,
      disrupts: false,
      endgameClimb: 'NOT_ATTEMPTED',
      autoClimb: 'NOT_ATTEMPTED',
    });
    expect(report.success).toBe(true);
  });

  it('preserves floating-point event time and validates source rules', () => {
    expect(
      EventInsertSchema.safeParse({
        time: 12.5,
        action: 'INTAKE',
        position: 'OUTPOST',
        points: 0,
        scoutReportUuid: 'report-1',
      }).success
    ).toBe(true);
    expect(TeamSourceRuleSchema.safeParse({ mode: 'INCLUDE', items: [8033] }).success).toBe(true);
    expect(TeamSourceRuleSchema.safeParse({ mode: 'ALL', items: [] }).success).toBe(false);
  });

  it('uses the original user roles in inserts and enum schemas', () => {
    expect(UserRoleSchema.options).toEqual(['ANALYST', 'SCOUTING_LEAD']);
    expect(
      UserInsertSchema.safeParse({
        id: 'auth0|test',
        email: 'test@example.com',
        role: 'ANALYST',
      }).success
    ).toBe(true);
  });

  it('can emit OpenAPI components from a derived Drizzle schema', () => {
    const app = new OpenAPIHono();
    app.openAPIRegistry.register('Match', MatchSchema);
    const document = app.getOpenAPIDocument({
      openapi: '3.1.0',
      info: { title: 'Schema test', version: 'test' },
    });

    expect(document.components?.schemas?.Match).toBeDefined();
  });
});
