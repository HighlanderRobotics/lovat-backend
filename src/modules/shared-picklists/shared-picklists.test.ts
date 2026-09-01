import { beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createSharedPicklistsRouter } from './shared-picklists.routes';
import type {
  SharedPicklist,
  SharedPicklistRecord,
  SharedPicklistsRepository,
} from './shared-picklists.repository';
import { createSharedPicklistsService } from './shared-picklists.service';

const accounts = new Map([
  ['author', { id: 'author', teamNumber: 8033, verified: true, username: 'Author' }],
  ['teammate', { id: 'teammate', teamNumber: 8033, verified: true, username: 'Teammate' }],
  ['other', { id: 'other', teamNumber: 254, verified: true, username: 'Other' }],
]);
function createMemoryRepository() {
  const rows = new Map<string, SharedPicklist>();
  const enrich = (row: SharedPicklist): SharedPicklistRecord => {
    const author = accounts.get(row.authorId)!;
    return { ...row, authorTeamNumber: author.teamNumber, authorUsername: author.username };
  };
  const repository: SharedPicklistsRepository = {
    async findAccount(userId) {
      const row = accounts.get(userId);
      return row ? { id: row.id, teamNumber: row.teamNumber, verified: row.verified } : null;
    },
    async list(teamNumber) {
      return [...rows.values()]
        .filter((row) => accounts.get(row.authorId)?.teamNumber === teamNumber)
        .map(enrich);
    },
    async find(uuid) {
      const row = rows.get(uuid);
      return row ? enrich(row) : null;
    },
    async create(values) {
      const row = { uuid: randomUUID(), ...values } as SharedPicklist;
      rows.set(row.uuid, row);
      return row;
    },
    async update(uuid, values) {
      const row = rows.get(uuid);
      if (!row) return null;
      const updated = { ...row, ...values };
      rows.set(uuid, updated);
      return updated;
    },
    async delete(uuid) {
      return rows.delete(uuid);
    },
  };
  return { repository, rows };
}

describe('shared picklists module', () => {
  let memory: ReturnType<typeof createMemoryRepository>;
  beforeEach(() => {
    memory = createMemoryRepository();
  });
  function router() {
    return createSharedPicklistsRouter({
      sharedPicklists: createSharedPicklistsService(memory.repository),
      authenticator: {
        async authenticate(token) {
          const account = accounts.get(token);
          return account ? { userId: account.id, role: 'ANALYST', tokenType: 'jwt' } : null;
        },
      },
    });
  }

  it('creates metric picklists with legacy zero defaults and lists them for the team', async () => {
    const app = router();
    const created = await app.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer author', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Week 1', totalPoints: 12.5 }),
    });
    expect(created.status).toBe(201);
    const body = (await created.json()) as Record<string, unknown>;
    expect(body.totalPoints).toBe(12.5);
    expect(body.autoPoints).toBe(0);
    expect(body.authorUsername).toBe('Author');
    expect(body).not.toHaveProperty('authorId');
    const listed = await app.request('/', { headers: { authorization: 'Bearer teammate' } });
    expect(((await listed.json()) as { picklists: unknown[] }).picklists).toHaveLength(1);
  });

  it('allows team-wide edits and deletes while blocking other teams', async () => {
    const service = createSharedPicklistsService(memory.repository);
    const values = {
      name: 'Original',
      totalPoints: 0,
      autoPoints: 0,
      teleopPoints: 0,
      climbResult: 0,
      autoClimb: 0,
      defenseEffectiveness: 0,
      contactDefenseTime: 0,
      campingDefenseTime: 0,
      totalDefensiveTime: 0,
      totalFuelThroughput: 0,
      totalFuelFed: 0,
      feedingRate: 0,
      scoringRate: 0,
      estimatedSuccessfulFuelRate: 0,
      estimatedTotalFuelScored: 0,
      driverAbility: 0,
    };
    const created = await service.create('author', values);
    const updated = await service.update('teammate', created.uuid, {
      ...values,
      name: 'Team edit',
    });
    expect(updated.name).toBe('Team edit');
    expect(updated.authorId).toBe('teammate');
    await expect(service.delete('other', created.uuid)).rejects.toThrow('another team');
    await service.delete('author', created.uuid);
    expect(memory.rows.size).toBe(0);
  });

  it('requires authentication and publishes schemas without private author ids', async () => {
    const app = router();
    expect((await app.request('/')).status).toBe(401);
    const document = JSON.stringify(
      app.getOpenAPIDocument({ openapi: '3.1.0', info: { title: 'test', version: 'test' } })
    );
    expect(document).toContain('SharedPicklistWrite');
    expect(document).not.toContain('authorId');
  });
});
