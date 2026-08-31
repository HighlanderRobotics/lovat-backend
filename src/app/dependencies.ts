import { createAuth0Authenticator } from '../integrations/auth0/auth0-authenticator';
import { createAccountsRepository, createAccountsService } from '../modules/accounts';
import { createApiKeysRepository, createApiKeysService } from '../modules/api-keys';
import { loadEnvironment } from '../platform/config/environment';
import { createDatabase } from '../platform/database/client';
import type { Authenticator } from '../platform/auth/types';
import type { AccountsService } from '../modules/accounts';
import type { ApiKeysService } from '../modules/api-keys';

export type AppDependencies = {
  accounts: AccountsService;
  apiKeys: ApiKeysService;
  authenticator: Authenticator;
  apiVersion: string;
};

export function createProductionDependencies(): AppDependencies {
  const environment = loadEnvironment();
  const database = createDatabase(environment);
  const accountsRepository = createAccountsRepository(database);
  const apiKeysRepository = createApiKeysRepository(database);

  return {
    accounts: createAccountsService(accountsRepository),
    apiKeys: createApiKeysService(apiKeysRepository),
    authenticator: createAuth0Authenticator(
      environment.AUTH0_DOMAIN,
      environment.AUTH0_AUDIENCE,
      accountsRepository
    ),
    apiVersion: environment.API_VERSION,
  };
}
