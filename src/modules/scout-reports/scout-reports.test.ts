import { beforeEach, describe, expect, it } from 'bun:test';
import { createScoutReportsRouter } from './scout-reports.routes';
import type {
  ScoutEvent,
  ScoutReport,
  ScoutReportAccount,
  ScoutReportRecord,
  ScoutReportsRepository,
} from './scout-reports.repository';
import { createScoutReportsService } from './scout-reports.service';

const accounts = new Map<string, ScoutReportAccount>([
  ['analyst', accountRow('analyst', 8033, 'ANALYST', true)],
  ['lead', accountRow('lead', 8033, 'SCOUTING_LEAD', true)],
  ['other', accountRow('other', 254, 'SCOUTING_LEAD', true)],
  ['unverified', accountRow('unverified', 254, 'ANALYST', false)],
]);

function accountRow(
  id: string,
  teamNumber: number,
  role: ScoutReportAccount['role'],
  teamVerified: boolean
): ScoutReportAccount {
  return {
    id,
    teamNumber,
    role,
    teamVerified,
    teamSourceRule: { mode: 'EXCLUDE', items: [] },
    tournamentSourceRule: { mode: 'EXCLUDE', items: [] },
  };
}

function createMemoryRepository() {
  const reports = new Map<string, ScoutReportRecord>();
  const eventRows = new Map<string, ScoutEvent[]>();
  let invalidations = 0;
  const repository: ScoutReportsRepository = {
    async findAccount(userId) {
      return accounts.get(userId) ?? null;
    },
    async findScouter(uuid) {
      return uuid === '00000000-0000-4000-8000-000000000001'
        ? { uuid, sourceTeamNumber: 8033 }
        : null;
    },
    async findMatch(input) {
      return input.tournamentKey === '2026test' &&
        input.matchNumber === 1 &&
        input.teamNumber === 8033
        ? {
            key: '2026test_qm1_8033',
            tournamentKey: input.tournamentKey,
            teamNumber: input.teamNumber,
          }
        : null;
    },
    async findReport(uuid) {
      return reports.get(uuid) ?? null;
    },
    async listEvents(uuid, ordered) {
      const rows = [...(eventRows.get(uuid) ?? [])];
      return ordered ? rows.sort((a, b) => a.time - b.time) : rows;
    },
    async listForMatch(teamMatchKey) {
      return [...reports.values()]
        .filter((report) => report.teamMatchKey === teamMatchKey)
        .map((report) => ({
          uuid: report.uuid,
          scouterUuid: report.scouterUuid,
          notes: report.notes,
          startTime: report.startTime,
          robotBrokeDescription: report.robotBrokeDescription,
          scouterName: report.scouterName,
          sourceTeamNumber: report.sourceTeamNumber,
        }));
    },
    async teamExists(teamNumber) {
      return teamNumber === 8033 || teamNumber === 254;
    },
    async countTeamReports(teamNumber) {
      return [...reports.values()].filter(({ teamNumber: reportTeam }) => reportTeam === teamNumber)
        .length;
    },
    async listTeamNotes(teamNumber, user) {
      return [...reports.values()]
        .filter(
          (report) =>
            report.teamNumber === teamNumber &&
            report.notes !== '' &&
            (user.teamSourceRule.mode === 'EXCLUDE'
              ? !user.teamSourceRule.items.includes(report.sourceTeamNumber)
              : user.teamSourceRule.items.includes(report.sourceTeamNumber)) &&
            (user.tournamentSourceRule.mode === 'EXCLUDE'
              ? !user.tournamentSourceRule.items.includes(report.tournamentKey)
              : user.tournamentSourceRule.items.includes(report.tournamentKey))
        )
        .map((report) => ({
          notes: report.notes,
          robotBrokeDescription: report.robotBrokeDescription,
          match: report.teamMatchKey,
          tournamentName: report.tournamentName,
          sourceTeam: report.sourceTeamNumber,
          scouterName: report.scouterName,
        }));
    },
    async create(report, events) {
      if (reports.has(report.uuid!)) throw Object.assign(new Error('duplicate'), { code: '23505' });
      const row = report as ScoutReport;
      reports.set(row.uuid, {
        ...row,
        scouterName: 'Scout',
        sourceTeamNumber: 8033,
        teamNumber: 8033,
        tournamentKey: '2026test',
        tournamentName: 'Test Regional',
      });
      eventRows.set(
        row.uuid,
        events.map((event, index) => ({
          eventUuid: `event-${index}`,
          quantity: null,
          ...event,
        })) as ScoutEvent[]
      );
      invalidations += 1;
      return row;
    },
    async updateNotes(uuid, notes) {
      const row = reports.get(uuid);
      if (!row) return null;
      const updated = { ...row, notes };
      reports.set(uuid, updated);
      invalidations += 1;
      return updated;
    },
    async delete(uuid) {
      eventRows.delete(uuid);
      const deleted = reports.delete(uuid);
      if (deleted) invalidations += 1;
      return deleted;
    },
  };
  return { repository, reports, eventRows, invalidations: () => invalidations };
}

const baseInput = {
  uuid: '00000000-0000-4000-8000-000000000010',
  tournamentKey: '2026test',
  matchType: 'QUALIFICATION' as const,
  matchNumber: 1,
  startTime: 1_700_000_000_000,
  notes: 'initial',
  robotRoles: ['SCORING'] as const,
  mobility: 'TRENCH' as const,
  beached: 'NEITHER' as const,
  feederTypes: ['CONTINUOUS'] as const,
  intakeType: 'GROUND' as const,
  driverAbility: 4,
  accuracy: 3,
  disrupts: false,
  defenseEffectiveness: 2,
  scoresWhileMoving: true,
  autoClimb: 'NOT_ATTEMPTED' as const,
  endgameClimb: 'L1' as const,
  scouterUuid: '00000000-0000-4000-8000-000000000001',
  teamNumber: 8033,
  events: [
    [0, 2, 8],
    [10, 0, 2],
    [12, 1, 2, 7],
  ],
};

describe('scout reports module', () => {
  let memory: ReturnType<typeof createMemoryRepository>;
  beforeEach(() => {
    memory = createMemoryRepository();
  });

  it('creates reports, maps legacy events, and exposes scouter identity only to teammates', async () => {
    const service = createScoutReportsService(memory.repository);
    const created = await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
    });
    expect(created.scoutReport.scouterName).toBe('Scout');
    expect(created.canModify).toBe(false);
    expect(created.events.map(({ action, points }) => [action, points])).toEqual([
      ['START_MATCH', 0],
      ['START_SCORING', 0],
      ['STOP_SCORING', 7],
    ]);
    const other = await service.get('other', baseInput.uuid);
    expect(other.scoutReport).not.toHaveProperty('scouterName');
    expect(memory.invalidations()).toBe(1);
  });

  it('enforces timeline nesting and repairs orphaned starts from affected app versions', async () => {
    const service = createScoutReportsService(memory.repository);
    await expect(
      service.create('analyst', {
        ...baseInput,
        robotRoles: [...baseInput.robotRoles],
        feederTypes: [...baseInput.feederTypes],
        events: [[1, 0, 2]],
      })
    ).rejects.toThrow('Missing stop event');
    await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
      appVersion: '26.0.3',
      events: [
        [1, 0, 2],
        [2, 7, 6],
      ],
    });
    expect(memory.eventRows.get(baseInput.uuid)?.map(({ action }) => action)).toEqual(['INTAKE']);
  });

  it('allows only the source team lead to update notes and delete', async () => {
    const service = createScoutReportsService(memory.repository);
    await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
    });
    await expect(service.updateNotes('analyst', baseInput.uuid, 'no')).rejects.toThrow(
      'scouting lead'
    );
    const updated = await service.updateNotes('lead', baseInput.uuid, 'reviewed');
    expect(updated.scoutReport.notes).toBe('reviewed');
    await expect(service.delete('other', baseInput.uuid)).rejects.toThrow('scouting lead');
    await service.delete('lead', baseInput.uuid);
    expect(memory.reports.size).toBe(0);
    expect(memory.eventRows.size).toBe(0);
    expect(memory.invalidations()).toBe(3);
  });

  it('orders and converts the legacy timeline and publishes authenticated OpenAPI routes', async () => {
    const service = createScoutReportsService(memory.repository);
    await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
    });
    memory.eventRows.get(baseInput.uuid)!.reverse();
    expect(await service.timeline('analyst', baseInput.uuid)).toEqual([
      [0, 2, 8],
      [10, 0, 2],
      [12, 1, 2, 7],
    ]);
    const router = createScoutReportsRouter({
      scoutReports: service,
      authenticator: {
        async authenticate(token) {
          return accounts.has(token)
            ? { userId: token, role: accounts.get(token)!.role, tokenType: 'jwt' }
            : null;
        },
      },
    });
    expect((await router.request(`/${baseInput.uuid}`)).status).toBe(401);
    const document = JSON.stringify(
      router.getOpenAPIDocument({ openapi: '3.1.0', info: { title: 'test', version: 'test' } })
    );
    expect(document).toContain('/{uuid}/timeline');
    expect(document).toContain('ScoutReportCreate');
  });

  it('accepts the legacy mobile report upload without dashboard authentication', async () => {
    const service = createScoutReportsService(memory.repository);
    const router = createScoutReportsRouter({
      scoutReports: service,
      authenticator: {
        async authenticate() {
          return null;
        },
      },
    });
    const response = await router.request('/public', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(baseInput),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ uuid: baseInput.uuid });
    expect(memory.reports.has(baseInput.uuid)).toBe(true);
    expect(memory.eventRows.get(baseInput.uuid)).toHaveLength(3);
  });

  it('lists match reports with team-scoped names and modification flags', async () => {
    const service = createScoutReportsService(memory.repository);
    await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
    });
    const own = await service.listForMatch('lead', '2026test_qm1_8033');
    expect(own[0]).toMatchObject({
      scouter: { name: 'Scout', sourceTeamNumber: 8033 },
      canModify: true,
    });
    const outside = await service.listForMatch('other', '2026test_qm1_8033');
    expect(outside[0]).toMatchObject({
      scouter: { name: 'Scouter from 8033', sourceTeamNumber: 8033 },
      canModify: false,
    });
    await expect(service.listForMatch('unverified', '2026test_qm1_8033')).rejects.toThrow(
      'verified team'
    );
  });

  it('computes the legacy report metrics and autonomous path payload', async () => {
    const service = createScoutReportsService(memory.repository);
    await service.create('analyst', {
      ...baseInput,
      robotRoles: ['SCORING', 'DEFENDING'],
      feederTypes: [...baseInput.feederTypes],
      autoClimb: 'SUCCEEDED',
      events: [
        [0, 2, 8],
        [10, 0, 2],
        [12, 1, 2, 7],
        [20, 11, 2],
        [30, 5, 2],
        [45, 6, 2],
        [60, 12, 6],
        [70, 13, 6, 5],
      ],
    });
    const metrics = await service.metrics('analyst', baseInput.uuid);
    expect(metrics).toMatchObject({
      totalPoints: 17,
      totalBallsFed: 5,
      volleys: 1,
      robotRoles: [1, 3],
      climb: 1,
      autoClimb: 1,
      autoClimbStartTime: 20,
      contactDefenseTime: 15,
      totalDefenseTime: 15,
      feedingRate: 0.5,
      feeds: 1,
      climbResult: 1,
      autoPath: {
        autoPoints: 7,
        match: '2026test_qm1_8033',
        tournamentName: 'Test Regional',
        climb: 1,
      },
    });
    expect(metrics.autoPath.positions.map(({ event }) => event)).toEqual([2, 0, 1, 11]);
  });

  it('returns team notes with source filters and scouter-name privacy', async () => {
    const service = createScoutReportsService(memory.repository);
    await service.create('analyst', {
      ...baseInput,
      robotRoles: [...baseInput.robotRoles],
      feederTypes: [...baseInput.feederTypes],
    });
    expect(await service.teamNotes('analyst', 9999)).toEqual({ error: 'TEAM_DOES_NOT_EXIST' });
    expect(await service.teamNotes('analyst', 254)).toEqual({ error: 'NO_DATA_FOR_TEAM' });
    expect(await service.teamNotes('lead', 8033)).toEqual([
      expect.objectContaining({ notes: 'initial', scouterName: 'Scout', sourceTeam: 8033 }),
    ]);
    const outside = await service.teamNotes('other', 8033);
    if (!Array.isArray(outside)) throw new Error('Expected team notes');
    expect(outside[0]).not.toHaveProperty('scouterName');
    accounts.get('other')!.teamSourceRule = { mode: 'EXCLUDE', items: [8033] };
    expect(await service.teamNotes('other', 8033)).toEqual([]);
    accounts.get('other')!.teamSourceRule = { mode: 'EXCLUDE', items: [] };
  });
});
