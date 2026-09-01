import { beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { MutablePicklist, MutablePicklistsRepository } from './mutable-picklists.repository';
import { createMutablePicklistsRouter } from './mutable-picklists.routes';
import { createMutablePicklistsService } from './mutable-picklists.service';

describe('mutable picklists module', () => {
  let rows: Map<string, MutablePicklist>;
  let router: ReturnType<typeof createMutablePicklistsRouter>;

  beforeEach(() => {
    rows = new Map();
    const users = new Map([
      ['owner', { id: 'owner', teamNumber: 8033 }],
      ['teammate', { id: 'teammate', teamNumber: 8033 }],
      ['outsider', { id: 'outsider', teamNumber: 254 }],
    ]);
    const repository: MutablePicklistsRepository = {
      async findVerifiedAccount(id) {
        return users.get(id) ?? null;
      },
      async list(teamNumber) {
        return [...rows.values()]
          .filter((row) => users.get(row.authorId)?.teamNumber === teamNumber)
          .map(({ authorId, ...row }) => ({ ...row, authorUsername: authorId }));
      },
      async find(uuid) {
        const row = rows.get(uuid);
        if (!row) return null;
        return {
          ...row,
          authorTeamNumber: users.get(row.authorId)?.teamNumber ?? null,
          authorUsername: row.authorId,
        };
      },
      async create(values) {
        const row = { uuid: randomUUID(), tournamentKey: null, ...values } as MutablePicklist;
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
    router = createMutablePicklistsRouter({
      mutablePicklists: createMutablePicklistsService(repository),
      authenticator: {
        async authenticate(token) {
          const user = users.get(token);
          return user ? { userId: user.id, role: 'ANALYST', tokenType: 'jwt' } : null;
        },
      },
    });
  });

  it('creates, reads, updates, and deletes a picklist', async () => {
    const created = await router.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'First', teams: [8033, 254] }),
    });
    expect(created.status).toBe(201);
    const picklist = (await created.json()) as { uuid: string };
    const updated = await router.request(`/${picklist.uuid}`, {
      method: 'PUT',
      headers: { authorization: 'Bearer teammate', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated', teams: [254] }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()) as unknown).toMatchObject({ name: 'Updated', teams: [254] });
    expect(
      (
        await router.request(`/${picklist.uuid}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer owner' },
        })
      ).status
    ).toBe(204);
  });

  it('shares picklists within a team but prevents cross-team access', async () => {
    const created = await router.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Team list', teams: [] }),
    });
    const { uuid } = (await created.json()) as { uuid: string };
    expect(
      (await router.request(`/${uuid}`, { headers: { authorization: 'Bearer teammate' } })).status
    ).toBe(200);
    expect(
      (await router.request(`/${uuid}`, { headers: { authorization: 'Bearer outsider' } })).status
    ).toBe(403);
  });

  it('validates writes and never exposes author identifiers', async () => {
    const invalid = await router.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ name: '', teams: [-1] }),
    });
    expect(invalid.status).toBe(400);
    const created = await router.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Safe', teams: [] }),
    });
    expect(await created.text()).not.toContain('authorId');
  });
});
