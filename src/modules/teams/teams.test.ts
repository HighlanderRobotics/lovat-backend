import { beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import { NotFound } from '../../platform/http/errors';
import type { Team, TeamListOptions, TeamsRepository } from './teams.repository';
import { createTeamsService } from './teams.service';

const teamRows: Team[] = [
  { number: 254, name: 'The Cheesy Poofs' },
  { number: 1678, name: 'Citrus Circuits' },
  { number: 8033, name: 'Highlander Robotics' },
  { number: 9143, name: 'Armor Robotics' },
];

function createMemoryRepository(): TeamsRepository {
  return {
    async findUserTeamNumber(userId) {
      if (userId === 'missing') return undefined;
      return userId === 'no-team' ? null : 8033;
    },
    async list(options: TeamListOptions) {
      const filter = options.filter?.toLowerCase();
      const matching = teamRows
        .filter(
          ({ number, name }) =>
            !filter || number.toString().startsWith(filter) || name.toLowerCase().startsWith(filter)
        )
        .sort(
          (left, right) =>
            Number(right.number === options.userTeamNumber) -
              Number(left.number === options.userTeamNumber) || left.number - right.number
        );
      return {
        teams: matching.slice(options.offset, options.offset + options.limit),
        count: matching.length,
      };
    },
  };
}

describe('teams module', () => {
  let dependencies: AppDependencies;

  beforeEach(() => {
    dependencies = {
      teams: createTeamsService(createMemoryRepository()),
      accounts: {
        async getRequired() {
          throw new Error('Not used by this test');
        },
        async delete() {
          throw new Error('Not used by this test');
        },
        async updateSettings() {
          throw new Error('Not used by this test');
        },
        async listTeamMembers() {
          return [];
        },
        async listAnalysts() {
          return [];
        },
        async promoteToScoutingLead() {
          throw new Error('Not used by this test');
        },
      },
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
            ? { userId: 'analyst', role: 'ANALYST', tokenType: 'jwt' }
            : null;
        },
      },
      apiVersion: 'test',
    };
  });

  it('places the account team first before applying pagination', async () => {
    const response = await createApp(dependencies).request('/v2/teams?limit=2', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      teams: [
        { number: 8033, name: 'Highlander Robotics' },
        { number: 254, name: 'The Cheesy Poofs' },
      ],
      count: 4,
    });
  });

  it('supports case-insensitive name and team-number prefix searches', async () => {
    const app = createApp(dependencies);
    const byName = await app.request('/v2/teams?filter=the', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect((await byName.json()) as unknown).toEqual({
      teams: [{ number: 254, name: 'The Cheesy Poofs' }],
      count: 1,
    });

    const byNumber = await app.request('/v2/teams?filter=80', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect((await byNumber.json()) as unknown).toEqual({
      teams: [{ number: 8033, name: 'Highlander Robotics' }],
      count: 1,
    });
  });

  it('uses numeric ordering for accounts without a team', async () => {
    const service = createTeamsService(createMemoryRepository());
    const result = await service.list('no-team', { limit: 2, offset: 0 });
    expect(result.teams.map(({ number }) => number)).toEqual([254, 1678]);
  });

  it('rejects missing accounts and invalid pagination', async () => {
    const service = createTeamsService(createMemoryRepository());
    await expect(service.list('missing', { limit: 50, offset: 0 })).rejects.toBeInstanceOf(
      NotFound
    );

    const invalid = await createApp(dependencies).request('/v2/teams?offset=-1', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Invalid request' },
    });
  });

  it('requires authentication and publishes its OpenAPI contract', async () => {
    const app = createApp(dependencies);
    expect((await app.request('/v2/teams')).status).toBe(401);

    const specification = JSON.stringify(await (await app.request('/v2/openapi.json')).json());
    expect(specification).toContain('/v2/teams');
    expect(specification).toContain('TeamListResponse');
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
