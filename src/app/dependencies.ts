import { createAuth0Authenticator } from '../integrations/auth0/auth0-authenticator';
import { createAccountsRepository, createAccountsService } from '../modules/accounts';
import {
  createApiKeyAuthenticator,
  createApiKeysRepository,
  createApiKeysService,
} from '../modules/api-keys';
import { createTournamentsRepository, createTournamentsService } from '../modules/tournaments';
import { createTeamsRepository, createTeamsService } from '../modules/teams';
import { createScoutersRepository, createScoutersService } from '../modules/scouters';
import {
  createMutablePicklistsRepository,
  createMutablePicklistsService,
} from '../modules/mutable-picklists';
import { loadEnvironment } from '../platform/config/environment';
import { createDatabase } from '../platform/database/client';
import type { Authenticator } from '../platform/auth/types';
import type { AccountsService } from '../modules/accounts';
import type { ApiKeysService } from '../modules/api-keys';
import type { TournamentsService } from '../modules/tournaments';
import type { TeamsService } from '../modules/teams';
import type { ScoutersService } from '../modules/scouters';
import type { MutablePicklistsService } from '../modules/mutable-picklists';
import { createScoutReportsRepository, createScoutReportsService } from '../modules/scout-reports';
import type { ScoutReportsService } from '../modules/scout-reports';
import {
  createSharedPicklistsRepository,
  createSharedPicklistsService,
} from '../modules/shared-picklists';
import type { SharedPicklistsService } from '../modules/shared-picklists';
import { createCompositeAuthenticator } from '../platform/auth/composite-authenticator';
import { createTbaClient } from '../integrations/tba/tba-client';

export type AppDependencies = {
  accounts: AccountsService;
  apiKeys: ApiKeysService;
  tournaments: TournamentsService;
  teams: TeamsService;
  scouters: ScoutersService;
  mutablePicklists: MutablePicklistsService;
  scoutReports: ScoutReportsService;
  sharedPicklists: SharedPicklistsService;
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
  const scoutersRepository = createScoutersRepository(database);
  const mutablePicklistsRepository = createMutablePicklistsRepository(database);
  const scoutReportsRepository = createScoutReportsRepository(database);
  const sharedPicklistsRepository = createSharedPicklistsRepository(database);
  const dashboardAuthenticator = createAuth0Authenticator(
    environment.AUTH0_DOMAIN,
    environment.AUTH0_AUDIENCE,
    accountsRepository
  );

  return {
    accounts: createAccountsService(accountsRepository),
    apiKeys: createApiKeysService(apiKeysRepository),
    tournaments: createTournamentsService(
      tournamentsRepository,
      createTbaClient(environment.TBA_KEY)
    ),
    teams: createTeamsService(teamsRepository),
    scouters: createScoutersService(scoutersRepository),
    mutablePicklists: createMutablePicklistsService(mutablePicklistsRepository),
    scoutReports: createScoutReportsService(scoutReportsRepository),
    sharedPicklists: createSharedPicklistsService(sharedPicklistsRepository),
    authenticator: createCompositeAuthenticator(
      dashboardAuthenticator,
      createApiKeyAuthenticator(apiKeysRepository)
    ),
    apiVersion: environment.API_VERSION,
  };
}
