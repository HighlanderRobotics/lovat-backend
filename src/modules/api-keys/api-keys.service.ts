import { createHash, randomBytes } from 'node:crypto';
import { Forbidden, NotFound } from '../../platform/http/errors';
import type {
  ApiKeyOwner,
  ApiKeysRepository,
  ApiKeyWithOwner,
  ApiKeyWithUsername,
} from './api-keys.repository';

function canManage(requester: ApiKeyOwner, key: ApiKeyWithOwner) {
  if (requester.id === key.owner.id) return true;
  return (
    requester.role === 'SCOUTING_LEAD' &&
    requester.teamNumber !== null &&
    requester.teamNumber === key.owner.teamNumber
  );
}

function requirePermission(requester: ApiKeyOwner, key: ApiKeyWithOwner) {
  if (!canManage(requester, key)) {
    throw new Forbidden('You do not have permission to manage this API key');
  }
}

function toPublicKey(key: ApiKeyWithUsername) {
  return {
    ...key,
    createdAt: key.createdAt.toISOString(),
    lastUsed: key.lastUsed?.toISOString() ?? null,
  };
}

export function createApiKeysService(repository: ApiKeysRepository) {
  async function getRequester(userId: string) {
    const requester = await repository.findOwner(userId);
    if (!requester) throw new NotFound('Account not found');
    if (requester.teamNumber === null || requester.emailVerified !== true) {
      throw new Forbidden('A verified team is required to manage API keys');
    }
    return requester;
  }

  async function getManageableKey(requester: ApiKeyOwner, uuid: string) {
    const key = await repository.findById(uuid);
    if (!key) throw new NotFound('API key not found');
    requirePermission(requester, key);
    return key;
  }

  return {
    async list(userId: string) {
      const requester = await getRequester(userId);
      const keys =
        requester.role === 'SCOUTING_LEAD' && requester.teamNumber !== null
          ? await repository.listByTeam(requester.teamNumber)
          : await repository.listByUser(requester.id);
      return keys.map(toPublicKey);
    },

    async create(userId: string, name: string) {
      const requester = await getRequester(userId);
      const apiKey = `lvt-${randomBytes(32).toString('hex')}`;
      const keyHash = createHash('sha256').update(apiKey).digest('hex');
      await repository.create({ keyHash, name, userId: requester.id });
      return apiKey;
    },

    async rename(userId: string, uuid: string, name: string) {
      const requester = await getRequester(userId);
      await getManageableKey(requester, uuid);
      if (!(await repository.rename(uuid, name))) throw new NotFound('API key not found');
    },

    async revoke(userId: string, uuid: string) {
      const requester = await getRequester(userId);
      await getManageableKey(requester, uuid);
      if (!(await repository.delete(uuid))) throw new NotFound('API key not found');
    },
  };
}

export type ApiKeysService = ReturnType<typeof createApiKeysService>;
