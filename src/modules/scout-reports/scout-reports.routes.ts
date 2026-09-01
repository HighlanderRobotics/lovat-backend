import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { assertDashboardIdentity, bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import {
  ScoutReportCreateSchema,
  ScoutReportCreatedSchema,
  ScoutReportNotesSchema,
  ScoutReportPathSchema,
  ScoutReportResponseSchema,
  ScoutReportTimelineSchema,
  MatchScoutReportsPathSchema,
  MatchScoutReportsSchema,
} from './scout-reports.contracts';
import type { ScoutReportsService } from './scout-reports.service';

const errors = {
  400: {
    description: 'Invalid report or event timeline',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  401: {
    description: 'Authentication required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  403: {
    description: 'Team access required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'Scout report, scouter, or match not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;
const getRoute = createRoute({
  method: 'get',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: ScoutReportPathSchema },
  responses: {
    200: {
      description: 'Scout report and events',
      content: { 'application/json': { schema: ScoutReportResponseSchema } },
    },
    ...errors,
  },
});
const createPublicReportRoute = createRoute({
  method: 'post',
  path: '/public',
  request: { body: { content: { 'application/json': { schema: ScoutReportCreateSchema } } } },
  responses: {
    201: {
      description: 'Mobile scout report uploaded',
      content: { 'application/json': { schema: ScoutReportCreatedSchema } },
    },
    400: errors[400],
    404: errors[404],
  },
});
const createReportRoute = createRoute({
  method: 'post',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: ScoutReportCreateSchema } } } },
  responses: {
    201: {
      description: 'Scout report created',
      content: { 'application/json': { schema: ScoutReportResponseSchema } },
    },
    ...errors,
  },
});
const notesRoute = createRoute({
  method: 'patch',
  path: '/{uuid}/notes',
  security: [{ DashboardAuth: [] }],
  request: {
    params: ScoutReportPathSchema,
    body: { content: { 'application/json': { schema: ScoutReportNotesSchema } } },
  },
  responses: {
    200: {
      description: 'Scout report notes updated',
      content: { 'application/json': { schema: ScoutReportResponseSchema } },
    },
    ...errors,
  },
});
const deleteRoute = createRoute({
  method: 'delete',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: ScoutReportPathSchema },
  responses: { 204: { description: 'Scout report deleted' }, ...errors },
});
const timelineRoute = createRoute({
  method: 'get',
  path: '/{uuid}/timeline',
  security: [{ DashboardAuth: [] }],
  request: { params: ScoutReportPathSchema },
  responses: {
    200: {
      description: 'Legacy numeric event timeline ordered by time',
      content: { 'application/json': { schema: ScoutReportTimelineSchema } },
    },
    ...errors,
  },
});
const matchReportsRoute = createRoute({
  method: 'get',
  path: '/match/{matchKey}',
  security: [{ DashboardAuth: [] }],
  request: { params: MatchScoutReportsPathSchema },
  responses: {
    200: {
      description: 'Scout report summaries for a team match slot',
      content: { 'application/json': { schema: MatchScoutReportsSchema } },
    },
    ...errors,
  },
});

export function createScoutReportsRouter(dependencies: {
  scoutReports: ScoutReportsService;
  authenticator: Authenticator;
}) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.onError(handleErrors);
  router.openapi(createPublicReportRoute, async (c) =>
    c.json(await dependencies.scoutReports.createPublic(c.req.valid('json')), 201)
  );
  router.use('*', bearerAuth(dependencies.authenticator));
  router.openapi(getRoute, async (c) =>
    c.json(
      await dependencies.scoutReports.get(c.get('auth').userId, c.req.valid('param').uuid),
      200
    )
  );
  router.openapi(createReportRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    return c.json(
      await dependencies.scoutReports.create(c.get('auth').userId, c.req.valid('json')),
      201
    );
  });
  router.openapi(notesRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    return c.json(
      await dependencies.scoutReports.updateNotes(
        c.get('auth').userId,
        c.req.valid('param').uuid,
        c.req.valid('json').note
      ),
      200
    );
  });
  router.openapi(deleteRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    await dependencies.scoutReports.delete(c.get('auth').userId, c.req.valid('param').uuid);
    return c.body(null, 204);
  });
  router.openapi(timelineRoute, async (c) =>
    c.json(
      await dependencies.scoutReports.timeline(c.get('auth').userId, c.req.valid('param').uuid),
      200
    )
  );
  router.openapi(matchReportsRoute, async (c) =>
    c.json(
      await dependencies.scoutReports.listForMatch(
        c.get('auth').userId,
        c.req.valid('param').matchKey
      ),
      200
    )
  );
  return router;
}
