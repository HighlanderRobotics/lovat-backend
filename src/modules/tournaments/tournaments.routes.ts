import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { assertDashboardIdentity, bearerAuth } from '../../platform/auth/bearer-auth';
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
  PublicScouterScheduleSchema,
  TeamCodeScheduleHeaderSchema,
  PublicScheduledTournamentsSchema,
  TeamTournamentStatusQuerySchema,
  TeamTournamentStatusSchema,
  MatchResultsQuerySchema,
  MatchResultsSchema,
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
const teamTournamentStatusRoute = createRoute({
  method: 'get',
  path: '/{key}/team-status',
  security: [{ DashboardAuth: [] }],
  request: { params: TournamentPathSchema, query: TeamTournamentStatusQuerySchema },
  responses: {
    200: {
      description: 'Team qualification status from The Blue Alliance',
      content: { 'application/json': { schema: TeamTournamentStatusSchema } },
    },
    400: { description: 'Invalid team number', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    403: { description: 'A verified team is required', ...errorResponse },
    404: { description: 'Tournament or team participation not found', ...errorResponse },
    500: { description: 'The Blue Alliance status is unavailable', ...errorResponse },
  },
});
const matchResultsRoute = createRoute({
  method: 'get',
  path: '/matches/results',
  security: [{ DashboardAuth: [] }],
  request: { query: MatchResultsQuerySchema },
  responses: {
    200: {
      description: 'Scout-report aggregates for both match alliances',
      content: { 'application/json': { schema: MatchResultsSchema } },
    },
    400: { description: 'Invalid match key', ...errorResponse },
    401: { description: 'Authentication required', ...errorResponse },
    403: { description: 'A verified team is required', ...errorResponse },
    404: { description: 'Match not found or incomplete', ...errorResponse },
  },
});
const publicScouterScheduleRoute = createRoute({
  method: 'get',
  path: '/public/{key}/scouter-schedule',
  request: { params: TournamentPathSchema, headers: TeamCodeScheduleHeaderSchema },
  responses: {
    200: {
      description: 'Code-authenticated mobile scouter assignments',
      content: { 'application/json': { schema: PublicScouterScheduleSchema } },
    },
    400: { description: 'Schedule match data is unavailable or inconsistent', ...errorResponse },
    404: { description: 'Team code or tournament not found', ...errorResponse },
  },
});
const publicTournamentsRoute = createRoute({
  method: 'get',
  path: '/public',
  request: { headers: TeamCodeScheduleHeaderSchema, query: TournamentListQuerySchema },
  responses: {
    200: {
      description: 'Code-authenticated tournament catalog',
      content: { 'application/json': { schema: TournamentListResponseSchema } },
    },
    400: { description: 'Invalid query', ...errorResponse },
    404: { description: 'Team code not found', ...errorResponse },
  },
});
const publicScheduledTournamentsRoute = createRoute({
  method: 'get',
  path: '/public/scheduled',
  request: { headers: TeamCodeScheduleHeaderSchema },
  responses: {
    200: {
      description: 'Tournaments with a schedule for the code team',
      content: { 'application/json': { schema: PublicScheduledTournamentsSchema } },
    },
    400: { description: 'Invalid code', ...errorResponse },
    404: { description: 'Team code not found', ...errorResponse },
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
  router.openapi(publicScouterScheduleRoute, async (context) =>
    context.json(
      await dependencies.tournaments.getPublicScouterSchedule(
        context.req.valid('header')['x-team-code'],
        context.req.valid('param').key
      ),
      200
    )
  );
  router.openapi(publicTournamentsRoute, async (context) =>
    context.json(
      await dependencies.tournaments.listPublicTournaments(
        context.req.valid('header')['x-team-code'],
        context.req.valid('query')
      ),
      200
    )
  );
  router.openapi(publicScheduledTournamentsRoute, async (context) =>
    context.json(
      await dependencies.tournaments.listPublicScheduledTournaments(
        context.req.valid('header')['x-team-code']
      ),
      200
    )
  );
  router.use('*', bearerAuth(dependencies.authenticator));

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
  router.openapi(matchResultsRoute, async (context) =>
    context.json(
      await dependencies.tournaments.getMatchResults(
        context.get('auth').userId,
        context.req.valid('query').matchKey
      ),
      200
    )
  );
  router.openapi(teamTournamentStatusRoute, async (context) => {
    const { key } = context.req.valid('param');
    return context.json(
      await dependencies.tournaments.getTeamTournamentStatus(
        context.get('auth').userId,
        key,
        context.req.valid('query').teamNumber
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
  router.openapi(createShiftRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    return c.json(
      await dependencies.tournaments.createScouterShift(
        c.get('auth').userId,
        c.req.valid('param').key,
        c.req.valid('json')
      ),
      201
    );
  });
  router.openapi(updateShiftRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
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
    assertDashboardIdentity(c.get('auth'));
    const { key, uuid } = c.req.valid('param');
    await dependencies.tournaments.deleteScouterShift(c.get('auth').userId, key, uuid);
    return c.body(null, 204);
  });

  return router;
}
