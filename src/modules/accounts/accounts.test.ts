import { beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import type { Account, AccountsRepository } from './accounts.repository';
import { createAccountsService } from './accounts.service';

const originalAccount: Account = {
  id: 'auth0|user-1',
  teamNumber: 8033,
  email: 'user@example.com',
  emailVerified: true,
  username: 'scouter',
  role: 'ANALYST',
  tournamentSourceRule: { mode: 'EXCLUDE', items: [] },
  teamSourceRule: { mode: 'EXCLUDE', items: [] },
};

describe('accounts module', () => {
  let storedAccount: Account | null;
  let teammateAccount: Account;
  let dependencies: AppDependencies;

  beforeEach(() => {
    storedAccount = { ...originalAccount };
    teammateAccount = {
      ...originalAccount,
      id: 'auth0|user-2',
      email: 'teammate@example.com',
      username: 'teammate',
    };

    const repository: AccountsRepository = {
      async findById(id) {
        if (storedAccount?.id === id) return storedAccount;
        return teammateAccount.id === id ? teammateAccount : null;
      },
      async upsertFromAuth0() {
        throw new Error('Not used by this test');
      },
      async deleteById(id) {
        if (storedAccount?.id !== id) return false;
        storedAccount = null;
        return true;
      },
      async updateSettings(id, settings) {
        if (storedAccount?.id !== id) return null;
        storedAccount = { ...storedAccount, ...settings };
        return storedAccount;
      },
      async isTeamVerified(teamNumber) {
        return teamNumber === 8033;
      },
      async listTeamMembers(teamNumber, role) {
        return [storedAccount, teammateAccount].filter(
          (account): account is Account =>
            account !== null &&
            account.teamNumber === teamNumber &&
            (!role || account.role === role)
        );
      },
      async updateRole(id, role) {
        if (storedAccount?.id === id) {
          storedAccount = { ...storedAccount, role };
          return storedAccount;
        }
        if (teammateAccount.id === id) {
          teammateAccount = { ...teammateAccount, role };
          return teammateAccount;
        }
        return null;
      },
    };

    dependencies = {
      accounts: createAccountsService(repository),
      apiKeys: {
        async list() {
          return [];
        },
        async create() {
          throw new Error('Not used by this test');
        },
        async rename() {
          throw new Error('Not used by this test');
        },
        async revoke() {
          throw new Error('Not used by this test');
        },
      },
      tournaments: {
        async list() {
          return { tournaments: [], count: 0 };
        },
        async listTeams() {
          return [];
        },
        async checkMatch() {
          throw new Error('Not used by this test');
        },
        async listMatches() {
          return [];
        },
        async getPublicScouterSchedule() {
          throw new Error('Not used by this test');
        },
        async listPublicTournaments() {
          return { tournaments: [], count: 0 };
        },
        async listPublicScheduledTournaments() {
          return { tournaments: [] };
        },
        async getScouterSchedule() {
          return { hash: '', data: [] };
        },
        async createScouterShift() {
          throw new Error('Not used by this test');
        },
        async updateScouterShift() {
          throw new Error('Not used by this test');
        },
        async deleteScouterShift() {
          throw new Error('Not used by this test');
        },
      },
      teams: {
        async list() {
          return { teams: [], count: 0 };
        },
      },
      scouters: {
        async checkTeamCode() {
          return { valid: false as const };
        },
        async listByTeamCode() {
          return [];
        },
        async list() {
          return [];
        },
        async create() {
          throw new Error('Not used by this test');
        },
        async update() {
          throw new Error('Not used by this test');
        },
      },
      mutablePicklists: unusedMutablePicklists,
      sharedPicklists: unusedMutablePicklists,
      scoutReports: unusedScoutReports,
      authenticator: {
        async authenticate(token) {
          return token === 'valid-token'
            ? { userId: originalAccount.id, role: originalAccount.role, tokenType: 'jwt' }
            : null;
        },
      },
      apiVersion: 'test',
    };
  });

  it('returns the authenticated account', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/me', {
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: originalAccount.id,
      teamNumber: 8033,
      email: 'user@example.com',
      emailVerified: true,
      username: 'scouter',
      role: 'ANALYST',
    });
  });

  it('rejects requests without authentication', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/me');
    expect(response.status).toBe(401);
  });

  it('deletes only the authenticated account', async () => {
    const app = createApp(dependencies);
    const deleted = await app.request('/v2/accounts/me', {
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(deleted.status).toBe(204);

    const missing = await app.request('/v2/accounts/me', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(missing.status).toBe(404);
  });

  it('reads and updates typed account settings', async () => {
    const app = createApp(dependencies);
    const updated = await app.request('/v2/accounts/me/settings', {
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'New name',
        teamSourceRule: { mode: 'INCLUDE', items: [8033, 254] },
      }),
    });
    expect(updated.status).toBe(200);
    const expectedSettings = {
      username: 'New name',
      teamSourceRule: { mode: 'INCLUDE', items: [8033, 254] },
      tournamentSourceRule: { mode: 'EXCLUDE', items: [] },
    };
    expect(await updated.json()).toEqual(expectedSettings);

    const fetched = await app.request('/v2/accounts/me/settings', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(await fetched.json()).toEqual(expectedSettings);
  });

  it('rejects empty settings updates', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/me/settings', {
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it('lists verified team members without account settings', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/team/members', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { members: Record<string, unknown>[] };
    expect(body.members.map(({ id }) => id)).toEqual([originalAccount.id, teammateAccount.id]);
    expect(body.members[0]).not.toHaveProperty('teamSourceRule');
    expect(body.members[0]).not.toHaveProperty('emailVerified');
  });

  it('allows a scouting lead to list analysts and promote a teammate', async () => {
    storedAccount = { ...storedAccount!, role: 'SCOUTING_LEAD' };
    const app = createApp(dependencies);
    const analysts = await app.request('/v2/accounts/team/analysts', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(analysts.status).toBe(200);
    expect(
      ((await analysts.json()) as { members: { id: string }[] }).members.map(({ id }) => id)
    ).toEqual([teammateAccount.id]);
    const promoted = await app.request('/v2/accounts/team/scouting-leads', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ userId: teammateAccount.id }),
    });
    expect(promoted.status).toBe(200);
    expect(((await promoted.json()) as { role: string }).role).toBe('SCOUTING_LEAD');
    expect(teammateAccount.role).toBe('SCOUTING_LEAD');
  });

  it('prevents analysts from listing promotion candidates', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/team/analysts', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(403);
  });
});

const unusedMutablePicklists = {
  async list() {
    return [];
  },
  async get() {
    throw new Error('Not used by this test');
  },
  async create() {
    throw new Error('Not used by this test');
  },
  async update() {
    throw new Error('Not used by this test');
  },
  async delete() {
    throw new Error('Not used by this test');
  },
};
const unusedScoutReports = {
  async create() {
    throw new Error('Not used by this test');
  },
  async get() {
    throw new Error('Not used by this test');
  },
  async updateNotes() {
    throw new Error('Not used by this test');
  },
  async delete() {
    throw new Error('Not used by this test');
  },
  async timeline() {
    return [];
  },
};
