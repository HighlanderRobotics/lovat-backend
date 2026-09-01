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
  ScouterScheduleResponseSchema,
  ScouterShiftCreatedSchema,
  ScouterShiftPathSchema,
  ScouterShiftWriteSchema,
  MatchCatalogQuerySchema,
  MatchCatalogSchema,
  MatchCheckQuerySchema,
  MatchCheckResponseSchema,
} from './tournaments.contracts';
import type { TournamentsService } from './tournaments.service';

type TournamentsRouteDependencies = {
  tournaments: TournamentsService;
  authenticator: Authenticator;
};

const errorResponse = {
  content: { 'application/json': { schema: ErrorResponseSchema } },
} as const;

const checkMatchRoute = createRoute({
  method: 'get',
  path: '/matches/check',
  request: { query: MatchCheckQuerySchema },
  responses: {
    200: {
      description: 'Matching team slot and alliance',
      content: { 'application/json': { schema: MatchCheckResponseSchema } },
    },
    400: { description: 'Invalid query', ...errorResponse },
    404: { description: 'Match not found', ...errorResponse },
  },
});

const listMatchesRoute = createRoute({
  method: 'get',
  path: '/{key}/matches',
  security: [{ DashboardAuth: [] }],
  request: { params: TournamentPathSchema, query: MatchCatalogQuerySchema },
  responses: {
    200: {
      description: 'Tournament matches with scouting progress',
      content: { 'application/json': { schema: MatchCatalogSchema } },
    },
    400: { description: 'Invalid team filter', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    403: { description: 'A verified team is required', ...errorResponse },
    404: { description: 'Tournament not found', ...errorResponse },
  },
});

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

const getScouterScheduleRoute = createRoute({
  method: 'get',
  path: '/{key}/scouter-shifts',
  security: [{ DashboardAuth: [] }],
  request: { params: TournamentPathSchema },
  responses: {
    200: {
      description: 'The authenticated team scouter schedule',
      content: { 'application/json': { schema: ScouterScheduleResponseSchema } },
    },
    400: { description: 'Invalid tournament key', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    403: { description: 'A verified team is required', ...errorResponse },
    404: { description: 'Tournament not found', ...errorResponse },
  },
});

const mutateErrors = {
  400: { description: 'Invalid or overlapping shift', ...errorResponse },
  401: { description: 'Authentication required', ...errorResponse },
  403: { description: 'Scouting lead access required', ...errorResponse },
  404: { description: 'Tournament or shift not found', ...errorResponse },
} as const;
const createShiftRoute = createRoute({
  method: 'post',
  path: '/{key}/scouter-shifts',
  security: [{ DashboardAuth: [] }],
  request: {
    params: TournamentPathSchema,
    body: { content: { 'application/json': { schema: ScouterShiftWriteSchema } } },
  },
  responses: {
    201: {
      description: 'Shift created',
      content: { 'application/json': { schema: ScouterShiftCreatedSchema } },
    },
    ...mutateErrors,
  },
});
const updateShiftRoute = createRoute({
  method: 'put',
  path: '/{key}/scouter-shifts/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: {
    params: ScouterShiftPathSchema,
    body: { content: { 'application/json': { schema: ScouterShiftWriteSchema } } },
  },
  responses: { 204: { description: 'Shift updated' }, ...mutateErrors },
});
const deleteShiftRoute = createRoute({
  method: 'delete',
  path: '/{key}/scouter-shifts/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: ScouterShiftPathSchema },
  responses: { 204: { description: 'Shift deleted' }, ...mutateErrors },
});

export function createTournamentsRouter(dependencies: TournamentsRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.openapi(checkMatchRoute, async (context) =>
    context.json(await dependencies.tournaments.checkMatch(context.req.valid('query')), 200)
  );
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
  router.openapi(listMatchesRoute, async (context) => {
    const { key } = context.req.valid('param');
    return context.json(
      await dependencies.tournaments.listMatches(
        context.get('auth').userId,
        key,
        context.req.valid('query').teams
      ),
      200
    );
  });

  router.openapi(getScouterScheduleRoute, async (context) => {
    const { key } = context.req.valid('param');
    const schedule = await dependencies.tournaments.getScouterSchedule(
      context.get('auth').userId,
      key
    );
    return context.json(schedule, 200);
  });
  router.openapi(createShiftRoute, async (c) =>
    c.json(
      await dependencies.tournaments.createScouterShift(
        c.get('auth').userId,
        c.req.valid('param').key,
        c.req.valid('json')
      ),
      201
    )
  );
  router.openapi(updateShiftRoute, async (c) => {
    const { key, uuid } = c.req.valid('param');
    await dependencies.tournaments.updateScouterShift(
      c.get('auth').userId,
      key,
      uuid,
      c.req.valid('json')
    );
    return c.body(null, 204);
  });
  router.openapi(deleteShiftRoute, async (c) => {
    const { key, uuid } = c.req.valid('param');
    await dependencies.tournaments.deleteScouterShift(c.get('auth').userId, key, uuid);
    return c.body(null, 204);
  });

  return router;
}
