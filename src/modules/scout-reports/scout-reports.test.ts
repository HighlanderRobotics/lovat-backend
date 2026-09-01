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
  ['analyst', { id: 'analyst', teamNumber: 8033, role: 'ANALYST' }],
  ['lead', { id: 'lead', teamNumber: 8033, role: 'SCOUTING_LEAD' }],
  ['other', { id: 'other', teamNumber: 254, role: 'SCOUTING_LEAD' }],
]);

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
    async create(report, events) {
      if (reports.has(report.uuid!)) throw Object.assign(new Error('duplicate'), { code: '23505' });
      const row = report as ScoutReport;
      reports.set(row.uuid, {
        ...row,
        scouterName: 'Scout',
        sourceTeamNumber: 8033,
        teamNumber: 8033,
        tournamentKey: '2026test',
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
});
