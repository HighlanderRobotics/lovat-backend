import { describe, expect, it } from 'bun:test';
import type { Authenticator } from '../../platform/auth/types';
import type { AnalysisAccount, AnalysisReport, AnalysisRepository } from './analysis.repository';
import { createAnalysisRouter } from './analysis.routes';
import { createAnalysisService } from './analysis.service';

const account: AnalysisAccount = {
  id: 'analyst',
  teamNumber: 8033,
  teamSourceRule: { mode: 'EXCLUDE', items: [] },
  tournamentSourceRule: { mode: 'EXCLUDE', items: [] },
};

function report(
  uuid: string,
  matchKey: string,
  tournamentKey: string,
  tournamentDate: string,
  overrides: Partial<AnalysisReport> = {}
): AnalysisReport {
  return {
    uuid,
    matchKey,
    tournamentKey,
    tournamentDate,
    matchType: 'QUALIFICATION',
    matchNumber: 1,
    accuracy: 5,
    autoClimb: 'NOT_ATTEMPTED',
    beached: 'NEITHER',
    disrupts: false,
    driverAbility: 3,
    defenseEffectiveness: 2,
    endgameClimb: 'NOT_ATTEMPTED',
    feederTypes: [],
    fieldTraversal: 'NONE',
    intakeType: 'NEITHER',
    robotRoles: [],
    scoresWhileMoving: false,
    tournamentName: tournamentKey,
    sourceTeamNumber: 8033,
    scouterName: 'Scout',
    events: [],
    ...overrides,
  };
}

function event(
  reportUuid: string,
  time: number,
  action: AnalysisReport['events'][number]['action'],
  values: Partial<AnalysisReport['events'][number]> = {}
): AnalysisReport['events'][number] {
  return {
    eventUuid: `${reportUuid}-${time}-${action}`,
    scoutReportUuid: reportUuid,
    time,
    action,
    position: 'NONE',
    points: 0,
    quantity: 0,
    ...values,
  };
}

function memoryRepository(input: {
  exists?: boolean;
  count?: number;
  reports?: AnalysisReport[];
  account?: AnalysisAccount | null;
}): AnalysisRepository {
  return {
    async findAccount() {
      return input.account === undefined ? account : input.account;
    },
    async teamExists() {
      return input.exists ?? true;
    },
    async countTeamReports() {
      return input.count ?? input.reports?.length ?? 0;
    },
    async listTeamReports() {
      return input.reports ?? [];
    },
  };
}

describe('team category analysis', () => {
  it('preserves legacy missing-team and no-data results', async () => {
    const missing = createAnalysisService(memoryRepository({ exists: false, count: 0 }));
    const empty = createAnalysisService(memoryRepository({ count: 0 }));

    expect(await missing.categoryMetrics('analyst', 1)).toEqual({
      error: 'TEAM_DOES_NOT_EXIST',
    });
    expect(await empty.categoryMetrics('analyst', 1)).toEqual({ error: 'NO_DATA_FOR_TEAM' });
  });

  it('averages scouts by match and weights the newest tournament at 80 percent', async () => {
    const firstA = report('first-a', 'old_qm1_8033', 'old', '2026-01-01', {
      driverAbility: 1,
    });
    const firstB = report('first-b', 'old_qm1_8033', 'old', '2026-01-01', {
      driverAbility: 3,
    });
    const recent = report('recent', 'new_qm1_8033', 'new', '2026-02-01', {
      driverAbility: 4,
    });
    const service = createAnalysisService(
      memoryRepository({ reports: [firstA, firstB, recent], count: 3 })
    );

    const result = await service.categoryMetrics('analyst', 8033);

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.driverAbility).toBeCloseTo(3.6);
  });

  it('calculates event, timing, climb, and accuracy metrics with legacy semantics', async () => {
    const row = report('report', 'event_qm1_8033', 'event', '2026-03-01', {
      accuracy: 4,
      autoClimb: 'SUCCEEDED',
      endgameClimb: 'L2',
    });
    row.events = [
      event(row.uuid, 5, 'START_SCORING'),
      event(row.uuid, 10, 'STOP_SCORING', { points: 10, quantity: 10 }),
      event(row.uuid, 20, 'CLIMB'),
      event(row.uuid, 30, 'START_FEEDING'),
      event(row.uuid, 35, 'STOP_FEEDING', { quantity: 5 }),
      event(row.uuid, 100, 'CLIMB'),
      event(row.uuid, 110, 'START_DEFENDING'),
      event(row.uuid, 120, 'STOP_DEFENDING'),
      event(row.uuid, 125, 'INTAKE', { position: 'OUTPOST' }),
    ];
    const service = createAnalysisService(memoryRepository({ reports: [row], count: 1 }));

    const result = await service.categoryMetrics('analyst', 8033);

    if ('error' in result) throw new Error(result.error);
    expect(result.totalPoints).toBe(43.5);
    expect(result.autoPoints).toBe(8.5);
    expect(result.fuelPerSecond).toBe(2);
    expect(result.feedingRate).toBe(1);
    expect(result.totalFuelOutputted).toBe(15);
    expect(result.accuracy).toBe(85);
    expect(result.autoClimbStartTime).toBe(3);
    expect(result.l2StartTime).toBe(58);
    expect(result.contactDefenseTime).toBe(10);
    expect(result.outpostIntakes).toBe(1);
  });

  it('returns zero metrics when reports exist but source rules hide all of them', async () => {
    const service = createAnalysisService(memoryRepository({ reports: [], count: 2 }));
    const result = await service.categoryMetrics('analyst', 8033);
    if ('error' in result) throw new Error(result.error);
    expect(Object.values(result).every((value) => value === 0)).toBe(true);
  });

  it('summarizes scalar and array breakdowns using their legacy denominators', async () => {
    const first = report('first', 'event_qm1_8033', 'event', '2026-03-01', {
      robotRoles: ['SCORING', 'DEFENDING'],
      feederTypes: ['CONTINUOUS'],
      fieldTraversal: 'TRENCH',
      scoresWhileMoving: true,
    });
    const second = report('second', 'event_qm2_8033', 'event', '2026-03-01', {
      robotRoles: ['SCORING'],
      feederTypes: ['DUMP'],
      fieldTraversal: 'BUMP',
    });
    const service = createAnalysisService(memoryRepository({ reports: [first, second], count: 2 }));

    const result = await service.breakdownMetrics('analyst', 8033);

    if ('error' in result) throw new Error(result.error);
    expect(result.robotRole?.SCORING).toBeCloseTo(2 / 3);
    expect(result.robotRole?.DEFENDING).toBeCloseTo(1 / 3);
    expect(result.fieldTraversal).toEqual({ TRENCH: 0.5, BUMP: 0.5, BOTH: 0, NONE: 0 });
    expect(result.scoresWhileMoving).toEqual({ FALSE: 0.5, TRUE: 0.5 });
  });

  it('expands array breakdown details and masks other teams’ scouter names', async () => {
    const own = report('own', 'new_qm2_8033', 'new', '2026-02-01', {
      robotRoles: ['SCORING', 'DEFENDING'],
      tournamentName: 'New Event',
    });
    const external = report('external', 'old_qm1_8033', 'old', '2026-01-01', {
      robotRoles: ['FEEDING'],
      tournamentName: 'Old Event',
      sourceTeamNumber: 254,
      scouterName: 'Hidden',
    });
    const service = createAnalysisService(memoryRepository({ reports: [external, own], count: 2 }));

    const result = await service.breakdownDetails('analyst', 8033, 'robotRole');

    expect(result).toEqual([
      {
        key: 'new_qm2_8033',
        tournamentName: 'New Event',
        breakdown: 'SCORING',
        sourceTeam: 8033,
        scouter: 'Scout',
      },
      {
        key: 'new_qm2_8033',
        tournamentName: 'New Event',
        breakdown: 'DEFENDING',
        sourceTeam: 8033,
        scouter: 'Scout',
      },
      {
        key: 'old_qm1_8033',
        tournamentName: 'Old Event',
        breakdown: 'FEEDING',
        sourceTeam: 254,
      },
    ]);
  });

  it('returns metric, rank, and unknown flags in the requested order', async () => {
    const row = report('flag', 'event_qm1_8033', 'event', '2026-03-01', {
      driverAbility: 4,
    });
    const service = createAnalysisService(memoryRepository({ reports: [row], count: 1 }), {
      async getTeamEventStatus(eventKey, teamNumber) {
        expect([eventKey, teamNumber]).toEqual(['2026event', 8033]);
        return { rank: 7, matchesPlayed: 2, rankingPoints: 4 };
      },
      async getEventMatches() {
        throw new Error('Not used by this test');
      },
    });

    expect(
      await service.flags('analyst', 8033, ['driverAbility', 'rank', 'not-a-metric'], '2026event')
    ).toEqual([4, 7, null]);
    expect(await service.flags('analyst', 8033, ['rank'])).toEqual([0]);
  });

  it('exposes the authenticated OpenAPI route', async () => {
    const authenticator: Authenticator = {
      async authenticate(token) {
        return token === 'valid'
          ? { userId: 'analyst', role: 'ANALYST', tokenType: 'apiKey' }
          : null;
      },
    };
    const router = createAnalysisRouter({
      analysis: createAnalysisService(memoryRepository({ exists: false })),
      authenticator,
    });

    const response = await router.request('/category/team/8033', {
      headers: { authorization: 'Bearer valid' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ error: 'TEAM_DOES_NOT_EXIST' });
    const document = router.getOpenAPIDocument({
      openapi: '3.1.0',
      info: { title: 'test', version: 'test' },
    });
    expect(document.paths['/category/team/{teamNumber}']?.get?.security).toEqual([
      { DashboardAuth: [] },
    ]);
    expect(document.paths['/breakdown/team/{teamNumber}']?.get).toBeDefined();
    expect(document.paths['/breakdown/team/{teamNumber}/{breakdown}']?.get).toBeDefined();
    expect(document.paths['/flag/team/{teamNumber}']?.get).toBeDefined();
    const invalid = await router.request('/breakdown/team/8033/unknown', {
      headers: { authorization: 'Bearer valid' },
    });
    expect(invalid.status).toBe(400);
    const malformedFlags = await router.request('/flag/team/8033?flags=not-json', {
      headers: { authorization: 'Bearer valid' },
    });
    expect(await malformedFlags.json()).toEqual([]);
  });
});
