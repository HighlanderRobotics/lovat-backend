import { beforeEach, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import type {
  RosterAccount,
  Scouter,
  ScoutersRepository,
  ScouterPublic,
} from './scouters.repository';
import { createScoutersService } from './scouters.service';

const analyst: RosterAccount = {
  id: 'analyst',
  role: 'ANALYST',
  teamNumber: 8033,
  emailVerified: true,
};
const lead: RosterAccount = {
  id: 'lead',
  role: 'SCOUTING_LEAD',
  teamNumber: 8033,
  emailVerified: true,
};
const otherLead: RosterAccount = {
  id: 'other-lead',
  role: 'SCOUTING_LEAD',
  teamNumber: 254,
  emailVerified: true,
};
const unverified: RosterAccount = {
  id: 'unverified',
  role: 'SCOUTING_LEAD',
  teamNumber: 9143,
  emailVerified: false,
};

function createMemoryRepository() {
  const accounts = new Map(
    [analyst, lead, otherLead, unverified].map((account) => [account.id, account])
  );
  const records = new Map<string, Scouter>();

  const repository: ScoutersRepository = {
    async findAccount(userId) {
      return accounts.get(userId) ?? null;
    },
    async findById(uuid) {
      return records.get(uuid) ?? null;
    },
    async list(teamNumber, archived) {
      return [...records.values()]
        .filter(
          (scouter) =>
            scouter.sourceTeamNumber === teamNumber &&
            (archived === undefined || scouter.archived === archived)
        )
        .sort(
          (left, right) =>
            Number(left.archived) - Number(right.archived) ||
            (left.name ?? '').localeCompare(right.name ?? '')
        )
        .map(toPublic);
    },
    async create(teamNumber, name) {
      const scouter: Scouter = {
        uuid: randomUUID(),
        name,
        sourceTeamNumber: teamNumber,
        strikes: 0,
        scouterReliability: 0,
        archived: false,
      };
      records.set(scouter.uuid, scouter);
      return toPublic(scouter);
    },
    async update(uuid, changes) {
      const scouter = records.get(uuid);
      if (!scouter) return null;
      const updated = { ...scouter, ...changes };
      records.set(uuid, updated);
      return toPublic(updated);
    },
    async findTeamNumberByCode(code) {
      return code === 'team-8033' ? 8033 : null;
    },
  };

  function addScouter(teamNumber: number, name: string, archived = false) {
    const scouter: Scouter = {
      uuid: randomUUID(),
      name,
      sourceTeamNumber: teamNumber,
      strikes: 0,
      scouterReliability: 0,
      archived,
    };
    records.set(scouter.uuid, scouter);
    return scouter.uuid;
  }

  return { repository, records, addScouter };
}

function toPublic({ uuid, name, archived }: Scouter): ScouterPublic {
  return { uuid, name, archived };
}

describe('scouters module', () => {
  let memory: ReturnType<typeof createMemoryRepository>;
  let dependencies: AppDependencies;

  beforeEach(() => {
    memory = createMemoryRepository();
    dependencies = {
      scouters: createScoutersService(memory.repository),
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
      mutablePicklists: unusedMutablePicklists,
      sharedPicklists: unusedMutablePicklists,
      scoutReports: unusedScoutReports,
      authenticator: {
        async authenticate(token) {
          const account = [analyst, lead, otherLead, unverified].find(({ id }) => id === token);
          return account ? { userId: account.id, role: account.role, tokenType: 'jwt' } : null;
        },
      },
      apiVersion: 'test',
    };
  });

  it('lists only the account team roster and supports archived filtering', async () => {
    memory.addScouter(8033, 'Active');
    memory.addScouter(8033, 'Former', true);
    memory.addScouter(254, 'Other team');

    const response = await createApp(dependencies).request('/v2/scouters?archived=false', {
      headers: { authorization: 'Bearer analyst' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scouters: ScouterPublic[] };
    expect(body.scouters.map(({ name }) => name)).toEqual(['Active']);
    expect(body.scouters[0]).not.toHaveProperty('sourceTeamNumber');
    expect(body.scouters[0]).not.toHaveProperty('strikes');
  });

  it('allows scouting leads to create, rename, and archive their scouters', async () => {
    const app = createApp(dependencies);
    const created = await app.request('/v2/scouters', {
      method: 'POST',
      headers: { authorization: 'Bearer lead', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New scouter' }),
    });
    expect(created.status).toBe(201);
    const scouter = (await created.json()) as ScouterPublic;

    const updated = await app.request(`/v2/scouters/${scouter.uuid}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer lead', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', archived: true }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual({ uuid: scouter.uuid, name: 'Renamed', archived: true });
  });

  it('prevents analysts from changing the roster', async () => {
    const response = await createApp(dependencies).request('/v2/scouters', {
      method: 'POST',
      headers: { authorization: 'Bearer analyst', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized' }),
    });
    expect(response.status).toBe(403);
    expect(memory.records.size).toBe(0);
  });

  it('prevents scouting leads from changing another team’s scouter', async () => {
    const uuid = memory.addScouter(254, 'Protected');
    const response = await createApp(dependencies).request(`/v2/scouters/${uuid}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer lead', 'content-type': 'application/json' },
      body: JSON.stringify({ archived: true }),
    });
    expect(response.status).toBe(403);
    expect(memory.records.get(uuid)?.archived).toBe(false);
  });

  it('requires a verified team even for roster reads', async () => {
    const response = await createApp(dependencies).request('/v2/scouters', {
      headers: { authorization: 'Bearer unverified' },
    });
    expect(response.status).toBe(403);
  });

  it('rejects empty updates and publishes the roster contracts', async () => {
    const uuid = memory.addScouter(8033, 'Existing');
    const app = createApp(dependencies);
    const invalid = await app.request(`/v2/scouters/${uuid}`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer lead', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Invalid request' },
    });

    const specification = JSON.stringify(await (await app.request('/v2/openapi.json')).json());
    expect(specification).toContain('/v2/scouters/{uuid}');
    expect(specification).toContain('ScouterListResponse');
    expect(specification).not.toContain('sourceTeamNumber');
    expect(specification).not.toContain('scouterReliability');
  });

  it('validates team codes and exposes only the code team active roster publicly', async () => {
    memory.addScouter(8033, 'Active');
    memory.addScouter(8033, 'Archived', true);
    memory.addScouter(254, 'Other');
    const app = createApp(dependencies);
    const valid = await app.request('/v2/scouters/team-code?code=team-8033');
    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ valid: true, teamNumber: 8033 });
    expect(await (await app.request('/v2/scouters/team-code?code=wrong')).json()).toEqual({
      valid: false,
    });
    const roster = await app.request('/v2/scouters/public', {
      headers: { 'x-team-code': 'team-8033' },
    });
    expect(roster.status).toBe(200);
    expect(
      ((await roster.json()) as { scouters: ScouterPublic[] }).scouters.map(({ name }) => name)
    ).toEqual(['Active']);
    expect(
      (await app.request('/v2/scouters/public', { headers: { 'x-team-code': 'wrong' } })).status
    ).toBe(404);
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
