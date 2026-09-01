import { createHash } from 'node:crypto';
import type { Authenticator } from '../../platform/auth/types';
import type { ApiKeysRepository } from './api-keys.repository';

export function createApiKeyAuthenticator(repository: ApiKeysRepository): Authenticator {
  return {
    async authenticate(token) {
      if (!token.startsWith('lvt-')) return null;
      const hash = createHash('sha256').update(token).digest('hex');
      const key = await repository.findByHash(hash);
      if (!key) return null;
      await repository.recordUsage(key.uuid);
      return { userId: key.owner.id, role: key.owner.role, tokenType: 'apiKey' };
    },
  };
}
