import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from './context';
import type { AppDependencies } from './dependencies';
import { createAccountsRouter } from '../modules/accounts';
import { createApiKeysRouter } from '../modules/api-keys';
import { createTournamentsRouter } from '../modules/tournaments';
import { createTeamsRouter } from '../modules/teams';
import { createScoutersRouter } from '../modules/scouters';
import { createMutablePicklistsRouter } from '../modules/mutable-picklists';
import { handleErrors } from '../platform/http/errors';
import { requestId } from '../platform/http/request-id';

export function createApp(dependencies: AppDependencies) {
  const app = new OpenAPIHono<AppEnvironment>();

  app.onError(handleErrors);
  app.use('*', requestId());

  app.get('/v2/health', (context) => context.json({ ok: true, version: dependencies.apiVersion }));

  app.route(
    '/v2/accounts',
    createAccountsRouter({
      accounts: dependencies.accounts,
      authenticator: dependencies.authenticator,
    })
  );
  app.route(
    '/v2/mutable-picklists',
    createMutablePicklistsRouter({
      mutablePicklists: dependencies.mutablePicklists,
      authenticator: dependencies.authenticator,
    })
  );

  app.route(
    '/v2/api-keys',
    createApiKeysRouter({
      apiKeys: dependencies.apiKeys,
      authenticator: dependencies.authenticator,
    })
  );

  app.route(
    '/v2/tournaments',
    createTournamentsRouter({
      tournaments: dependencies.tournaments,
      authenticator: dependencies.authenticator,
    })
  );

  app.route(
    '/v2/teams',
    createTeamsRouter({
      teams: dependencies.teams,
      authenticator: dependencies.authenticator,
    })
  );

  app.route(
    '/v2/scouters',
    createScoutersRouter({
      scouters: dependencies.scouters,
      authenticator: dependencies.authenticator,
    })
  );

  app.openAPIRegistry.registerComponent('securitySchemes', 'DashboardAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  app.doc('/v2/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'Lovat API',
      version: dependencies.apiVersion,
    },
  });

  return app;
}
