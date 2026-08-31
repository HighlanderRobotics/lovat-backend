import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { dashboardAuth } from '../../platform/auth/dashboard-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import { TeamListQuerySchema, TeamListResponseSchema } from './teams.contracts';
import type { TeamsService } from './teams.service';

type TeamsRouteDependencies = {
  teams: TeamsService;
  authenticator: Authenticator;
};

const listTeamsRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { query: TeamListQuerySchema },
  responses: {
    200: {
      description: 'Filtered team catalog with the authenticated account team first',
      content: { 'application/json': { schema: TeamListResponseSchema } },
    },
    400: {
      description: 'Invalid query',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Account not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

export function createTeamsRouter(dependencies: TeamsRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.use('*', dashboardAuth(dependencies.authenticator));

  router.openapi(listTeamsRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await dependencies.teams.list(context.get('auth').userId, query);
    return context.json(result, 200);
  });

  return router;
}
