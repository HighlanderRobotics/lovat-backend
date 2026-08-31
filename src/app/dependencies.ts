import { createAuth0Authenticator } from '../integrations/auth0/auth0-authenticator';
import { createAccountsRepository, createAccountsService } from '../modules/accounts';
import { createApiKeysRepository, createApiKeysService } from '../modules/api-keys';
import { createTournamentsRepository, createTournamentsService } from '../modules/tournaments';
import { createTeamsRepository, createTeamsService } from '../modules/teams';
import { loadEnvironment } from '../platform/config/environment';
import { createDatabase } from '../platform/database/client';
import type { Authenticator } from '../platform/auth/types';
import type { AccountsService } from '../modules/accounts';
import type { ApiKeysService } from '../modules/api-keys';
import type { TournamentsService } from '../modules/tournaments';
import type { TeamsService } from '../modules/teams';

export type AppDependencies = {
  accounts: AccountsService;
  apiKeys: ApiKeysService;
  tournaments: TournamentsService;
  teams: TeamsService;
  authenticator: Authenticator;
  apiVersion: string;
};

export function createProductionDependencies(): AppDependencies {
  const environment = loadEnvironment();
  const database = createDatabase(environment);
  const accountsRepository = createAccountsRepository(database);
  const apiKeysRepository = createApiKeysRepository(database);
  const tournamentsRepository = createTournamentsRepository(database);
  const teamsRepository = createTeamsRepository(database);

  return {
    accounts: createAccountsService(accountsRepository),
    apiKeys: createApiKeysService(apiKeysRepository),
    tournaments: createTournamentsService(tournamentsRepository),
    teams: createTeamsService(teamsRepository),
    authenticator: createAuth0Authenticator(
      environment.AUTH0_DOMAIN,
      environment.AUTH0_AUDIENCE,
      accountsRepository
    ),
    apiVersion: environment.API_VERSION,
  };
}
