import { beforeEach, describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import { Forbidden } from '../../platform/http/errors';
import type {
  ApiKeyOwner,
  ApiKeyRecord,
  ApiKeysRepository,
  ApiKeyWithUsername,
} from './api-keys.repository';
import { createApiKeysService } from './api-keys.service';

const analyst: ApiKeyOwner = {
  id: 'analyst',
  role: 'ANALYST',
  teamNumber: 8033,
  emailVerified: true,
};
const teammate: ApiKeyOwner = {
  id: 'teammate',
  role: 'ANALYST',
  teamNumber: 8033,
  emailVerified: true,
};
const lead: ApiKeyOwner = {
  id: 'lead',
  role: 'SCOUTING_LEAD',
  teamNumber: 8033,
  emailVerified: true,
};
const outsider: ApiKeyOwner = {
  id: 'outsider',
  role: 'SCOUTING_LEAD',
  teamNumber: 1,
  emailVerified: true,
};
const unverified: ApiKeyOwner = {
  id: 'unverified',
  role: 'ANALYST',
  teamNumber: 2,
  emailVerified: false,
};

function createMemoryRepository() {
  const owners = new Map(
    [analyst, teammate, lead, outsider, unverified].map((owner) => [owner.id, owner])
  );
  const usernames = new Map([
    [analyst.id, 'Analyst'],
    [teammate.id, 'Teammate'],
    [lead.id, 'Lead'],
    [outsider.id, 'Outsider'],
    [unverified.id, 'Unverified'],
  ]);
  const keys = new Map<string, ApiKeyRecord>();

  const repository: ApiKeysRepository = {
    async findOwner(userId) {
      return owners.get(userId) ?? null;
    },
    async findById(uuid) {
      const key = keys.get(uuid);
      const owner = key ? owners.get(key.userId) : null;
      return key && owner ? { ...key, owner } : null;
    },
    async listByUser(userId) {
      return visibleKeys([...keys.values()].filter((key) => key.userId === userId));
    },
    async listByTeam(teamNumber) {
      return visibleKeys(
        [...keys.values()].filter((key) => owners.get(key.userId)?.teamNumber === teamNumber)
      );
    },
    async create(input) {
      const uuid = randomUUID();
      keys.set(uuid, {
        uuid,
        ...input,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        lastUsed: null,
        requests: 0,
      });
    },
    async rename(uuid, name) {
      const key = keys.get(uuid);
      if (!key) return false;
      keys.set(uuid, { ...key, name });
      return true;
    },
    async delete(uuid) {
      return keys.delete(uuid);
    },
  };

  function visibleKeys(records: ApiKeyRecord[]): ApiKeyWithUsername[] {
    return records.map(({ keyHash: _keyHash, userId, ...key }) => ({
      ...key,
      username: usernames.get(userId) ?? null,
    }));
  }

  function addKey(owner: ApiKeyOwner, name: string) {
    const uuid = randomUUID();
    keys.set(uuid, {
      uuid,
      keyHash: 'stored-hash',
      name,
      userId: owner.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastUsed: null,
      requests: 0,
    });
    return uuid;
  }

  return { repository, keys, addKey };
}

describe('api keys module', () => {
  let memory: ReturnType<typeof createMemoryRepository>;
  let dependencies: AppDependencies;

  beforeEach(() => {
    memory = createMemoryRepository();
    const apiKeys = createApiKeysService(memory.repository);
    dependencies = {
      apiKeys,
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
      },
      tournaments: {
        async list() {
          return { tournaments: [], count: 0 };
        },
        async listTeams() {
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
      teams: {
        async list() {
          return { teams: [], count: 0 };
        },
      },
      scouters: {
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
      authenticator: {
        async authenticate(token) {
          const owner = [analyst, teammate, lead, outsider, unverified].find(
            ({ id }) => id === token
          );
          return owner ? { userId: owner.id, role: owner.role, tokenType: 'jwt' } : null;
        },
      },
      apiVersion: 'test',
    };
  });

  it('creates a one-time secret and stores only its SHA-256 hash', async () => {
    const response = await createApp(dependencies).request('/v2/api-keys', {
      method: 'POST',
      headers: { authorization: 'Bearer analyst', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'CI' }),
    });

    expect(response.status).toBe(201);
    const { apiKey } = (await response.json()) as { apiKey: string };
    expect(apiKey).toStartWith('lvt-');

    const [stored] = [...memory.keys.values()];
    expect(stored.name).toBe('CI');
    expect(stored.keyHash).toBe(createHash('sha256').update(apiKey).digest('hex'));
    expect(stored.keyHash).not.toContain(apiKey);
  });

  it('shows analysts their own keys and scouting leads all team keys', async () => {
    memory.addKey(analyst, 'Analyst key');
    memory.addKey(teammate, 'Teammate key');
    memory.addKey(outsider, 'Other team key');

    const analystKeys = await dependencies.apiKeys.list(analyst.id);
    expect(analystKeys.map(({ name }) => name)).toEqual(['Analyst key']);

    const leadKeys = await dependencies.apiKeys.list(lead.id);
    expect(leadKeys.map(({ name }) => name)).toEqual(['Analyst key', 'Teammate key']);
    expect(leadKeys[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(leadKeys[0]).not.toHaveProperty('keyHash');
  });

  it('allows a scouting lead to rename and revoke a teammate key', async () => {
    const uuid = memory.addKey(analyst, 'Old name');
    await dependencies.apiKeys.rename(lead.id, uuid, 'New name');
    expect(memory.keys.get(uuid)?.name).toBe('New name');

    await dependencies.apiKeys.revoke(lead.id, uuid);
    expect(memory.keys.has(uuid)).toBe(false);
  });

  it('rejects management across teams', async () => {
    const uuid = memory.addKey(analyst, 'Protected');
    await expect(dependencies.apiKeys.rename(outsider.id, uuid, 'Stolen')).rejects.toBeInstanceOf(
      Forbidden
    );
    expect(memory.keys.get(uuid)?.name).toBe('Protected');
  });

  it('requires the account team to be verified', async () => {
    await expect(dependencies.apiKeys.create(unverified.id, 'Blocked')).rejects.toBeInstanceOf(
      Forbidden
    );
    expect(memory.keys.size).toBe(0);
  });

  it('validates names and never exposes key hashes in OpenAPI', async () => {
    const invalid = await createApp(dependencies).request('/v2/api-keys', {
      method: 'POST',
      headers: { authorization: 'Bearer analyst', 'content-type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Invalid request' },
    });

    const document = await createApp(dependencies).request('/v2/openapi.json');
    const specification = JSON.stringify(await document.json());
    expect(specification).toContain('/v2/api-keys');
    expect(specification).not.toContain('keyHash');
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
