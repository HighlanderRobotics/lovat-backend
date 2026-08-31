import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { dashboardAuth } from '../../platform/auth/dashboard-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import {
  TournamentListQuerySchema,
  TournamentListResponseSchema,
  TournamentPathSchema,
  TournamentTeamsResponseSchema,
} from './tournaments.contracts';
import type { TournamentsService } from './tournaments.service';

type TournamentsRouteDependencies = {
  tournaments: TournamentsService;
  authenticator: Authenticator;
};

const errorResponse = {
  content: { 'application/json': { schema: ErrorResponseSchema } },
} as const;

const listTournamentsRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { query: TournamentListQuerySchema },
  responses: {
    200: {
      description: 'Filtered tournament catalog with participation status',
      content: { 'application/json': { schema: TournamentListResponseSchema } },
    },
    400: { description: 'Invalid query', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    404: { description: 'Account not found', ...errorResponse },
  },
});

const listTournamentTeamsRoute = createRoute({
  method: 'get',
  path: '/{key}/teams',
  security: [{ DashboardAuth: [] }],
  request: { params: TournamentPathSchema },
  responses: {
    200: {
      description: 'Teams participating in the tournament',
      content: { 'application/json': { schema: TournamentTeamsResponseSchema } },
    },
    400: { description: 'Invalid tournament key', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    404: { description: 'Tournament not found', ...errorResponse },
  },
});

export function createTournamentsRouter(dependencies: TournamentsRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.use('*', dashboardAuth(dependencies.authenticator));

  router.openapi(listTournamentsRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await dependencies.tournaments.list(context.get('auth').userId, query);
    return context.json(result, 200);
  });

  router.openapi(listTournamentTeamsRoute, async (context) => {
    const { key } = context.req.valid('param');
    const teams = await dependencies.tournaments.listTeams(key);
    return context.json({ teams }, 200);
  });

  return router;
}
