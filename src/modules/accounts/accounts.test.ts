import { beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import type { Account, AccountsRepository, RegisteredTeam } from './accounts.repository';
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
  let registeredTeam: RegisteredTeam;
  let otherRegisteredTeam: RegisteredTeam | null;
  let dependencies: AppDependencies;

  beforeEach(() => {
    storedAccount = { ...originalAccount };
    teammateAccount = {
      ...originalAccount,
      id: 'auth0|user-2',
      email: 'teammate@example.com',
      username: 'teammate',
    };
    registeredTeam = {
      number: 8033,
      code: 'ABC123',
      email: 'team@example.com',
      emailVerified: true,
      timeCreated: new Date('2026-01-01T00:00:00Z'),
      teamApproved: true,
      website: null,
    };
    otherRegisteredTeam = null;

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
      async findRegisteredTeam(teamNumber) {
        if (teamNumber === registeredTeam.number) return registeredTeam;
        return teamNumber === otherRegisteredTeam?.number ? otherRegisteredTeam : null;
      },
      async updateTeamWebsite(teamNumber, website) {
        if (teamNumber !== registeredTeam.number) return null;
        registeredTeam = { ...registeredTeam, website };
        return registeredTeam;
      },
      async findRegisteredTeamByCode(code) {
        if (registeredTeam.code === code) return registeredTeam;
        return otherRegisteredTeam?.code === code ? otherRegisteredTeam : null;
      },
      async isFeatureEnabled() {
        return true;
      },
      async listTeamUserIds(teamNumber) {
        return [storedAccount, teammateAccount]
          .filter((account) => account?.teamNumber === teamNumber)
          .map((account) => account!.id)
          .sort();
      },
      async createRegistration(input) {
        otherRegisteredTeam = {
          number: input.number,
          code: input.code,
          email: input.email,
          emailVerified: false,
          timeCreated: new Date('2026-02-01T00:00:00Z'),
          teamApproved: input.teamApproved,
          website: null,
        };
        if (storedAccount?.id === input.userId)
          storedAccount = {
            ...storedAccount,
            teamNumber: input.number,
            role: 'SCOUTING_LEAD',
          };
        return otherRegisteredTeam;
      },
      async joinTeam(userId, teamNumber) {
        if (storedAccount?.id === userId) {
          storedAccount = { ...storedAccount, teamNumber };
          return storedAccount;
        }
        if (teammateAccount.id === userId) {
          teammateAccount = { ...teammateAccount, teamNumber };
          return teammateAccount;
        }
        return null;
      },
      async leaveTeam(userId) {
        if (storedAccount?.id !== userId) return null;
        storedAccount = { ...storedAccount, teamNumber: null, role: 'ANALYST' };
        return storedAccount;
      },
    };

    dependencies = {
      analysis: {
        async categoryMetrics() {
          throw new Error('Not used by this test');
        },
        async breakdownMetrics() {
          throw new Error('Not used by this test');
        },
        async breakdownDetails() {
          throw new Error('Not used by this test');
        },
        async flags() {
          throw new Error('Not used by this test');
        },
        async metricDetails() {
          throw new Error('Not used by this test');
        },
        async alliance() {
          throw new Error('Not used by this test');
        },
        async matchPrediction() {
          throw new Error('Not used by this test');
        },
        async qualificationRankingPrediction() {
          throw new Error('Not used by this test');
        },
        async picklist() {
          throw new Error('Not used by this test');
        },
      },
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
        async getTeamTournamentStatus() {
          throw new Error('Not used by this test');
        },
        async getMatchResults() {
          throw new Error('Not used by this test');
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
        async progress() {
          throw new Error('Not used by this test');
        },
        async reports() {
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

  it('lets leads read team contact details and any team member update the website', async () => {
    const app = createApp(dependencies);
    const updated = await app.request('/v2/accounts/team/website', {
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ website: 'https://team8033.org' }),
    });
    expect(updated.status).toBe(200);
    expect((await updated.json()) as unknown).toEqual({
      number: 8033,
      email: 'team@example.com',
      website: 'https://team8033.org',
    });
    expect(
      (
        await app.request('/v2/accounts/team/profile', {
          headers: { authorization: 'Bearer valid-token' },
        })
      ).status
    ).toBe(403);
    storedAccount = { ...storedAccount!, role: 'SCOUTING_LEAD' };
    const profile = await app.request('/v2/accounts/team/profile', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(profile.status).toBe(200);
    expect(await profile.json()).toEqual({
      number: 8033,
      email: 'team@example.com',
      website: 'https://team8033.org',
    });
  });

  it('returns the approved team code only to scouting leads', async () => {
    const app = createApp(dependencies);
    expect(
      (
        await app.request('/v2/accounts/team/code', {
          headers: { authorization: 'Bearer valid-token' },
        })
      ).status
    ).toBe(403);
    storedAccount = { ...storedAccount!, role: 'SCOUTING_LEAD' };
    const response = await app.request('/v2/accounts/team/code', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ code: 'ABC123' });
  });

  it('starts registration and promotes the requesting account', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/team/registration', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ number: 1678, email: 'contact@team1678.com' }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      number: 1678,
      verificationRequired: true,
      approvalRequired: true,
    });
    expect(storedAccount?.teamNumber).toBe(1678);
    expect(storedAccount?.role).toBe('SCOUTING_LEAD');
    expect(otherRegisteredTeam?.code).toHaveLength(6);
  });

  it('joins an existing team with its code', async () => {
    const response = await createApp(dependencies).request('/v2/accounts/team/join', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
      body: JSON.stringify({ number: 8033, code: registeredTeam.code }),
    });

    expect(response.status).toBe(200);
    expect(((await response.json()) as { teamNumber: number }).teamNumber).toBe(8033);
  });

  it('leaves a team and resets the account role', async () => {
    storedAccount = { ...storedAccount!, role: 'SCOUTING_LEAD' };
    const response = await createApp(dependencies).request('/v2/accounts/team/leave', {
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    expect((await response.json()) as unknown).toMatchObject({
      teamNumber: null,
      role: 'ANALYST',
    });
  });

  it('reports the registration lifecycle without exposing the team code', async () => {
    const app = createApp(dependencies);
    const notStarted = await app.request('/v2/accounts/team/1678/registration-status', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(await notStarted.json()).toEqual({ status: 'NOT_STARTED' });

    const pendingWebsite = await app.request('/v2/accounts/team/8033/registration-status', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(await pendingWebsite.json()).toEqual({ status: 'PENDING_WEBSITE' });

    registeredTeam = { ...registeredTeam, website: 'https://team8033.org' };
    const registered = await app.request('/v2/accounts/team/8033/registration-status', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(await registered.json()).toEqual({ status: 'REGISTERED_ON_TEAM' });
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
  async teamNotes() {
    return [];
  },
  async metrics() {
    throw new Error('Not used by this test');
  },
  async listForMatch() {
    return [];
  },
  async createPublic() {
    throw new Error('Not used by this test');
  },
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
