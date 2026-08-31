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
  let dependencies: AppDependencies;

  beforeEach(() => {
    storedAccount = { ...originalAccount };

    const repository: AccountsRepository = {
      async findById(id) {
        return storedAccount?.id === id ? storedAccount : null;
      },
      async upsertFromAuth0() {
        throw new Error('Not used by this test');
      },
      async deleteById(id) {
        if (storedAccount?.id !== id) return false;
        storedAccount = null;
        return true;
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
});
