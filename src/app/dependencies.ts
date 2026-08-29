import { createAuth0Authenticator } from '../integrations/auth0/auth0-authenticator';
import { createAccountsRepository, createAccountsService } from '../modules/accounts';
import { loadEnvironment } from '../platform/config/environment';
import { createDatabase } from '../platform/database/client';
import type { Authenticator } from '../platform/auth/types';
import type { AccountsService } from '../modules/accounts';

export type AppDependencies = {
  accounts: AccountsService;
  authenticator: Authenticator;
  apiVersion: string;
};

export function createProductionDependencies(): AppDependencies {
  const environment = loadEnvironment();
  const database = createDatabase(environment);
  const accountsRepository = createAccountsRepository(database);

  return {
    accounts: createAccountsService(accountsRepository),
    authenticator: createAuth0Authenticator(
      environment.AUTH0_DOMAIN,
      environment.AUTH0_AUDIENCE,
      accountsRepository
    ),
    apiVersion: environment.API_VERSION,
  };
}
