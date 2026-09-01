import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { dashboardAuth } from '../../platform/auth/dashboard-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import {
  SharedPicklistListSchema,
  SharedPicklistPathSchema,
  SharedPicklistPublicSchema,
  SharedPicklistWriteSchema,
} from './shared-picklists.contracts';
import type { SharedPicklistsService } from './shared-picklists.service';

const errors = {
  400: {
    description: 'Invalid request',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  401: {
    description: 'Authentication required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  403: {
    description: 'Verified same-team access required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'Shared picklist not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;
const listRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'Team shared picklists',
      content: { 'application/json': { schema: SharedPicklistListSchema } },
    },
    ...errors,
  },
});
const getRoute = createRoute({
  method: 'get',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: SharedPicklistPathSchema },
  responses: {
    200: {
      description: 'Shared picklist',
      content: { 'application/json': { schema: SharedPicklistPublicSchema } },
    },
    ...errors,
  },
});
const createPicklistRoute = createRoute({
  method: 'post',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: SharedPicklistWriteSchema } } } },
  responses: {
    201: {
      description: 'Shared picklist created',
      content: { 'application/json': { schema: SharedPicklistPublicSchema } },
    },
    ...errors,
  },
});
const updateRoute = createRoute({
  method: 'put',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: {
    params: SharedPicklistPathSchema,
    body: { content: { 'application/json': { schema: SharedPicklistWriteSchema } } },
  },
  responses: {
    200: {
      description: 'Shared picklist updated',
      content: { 'application/json': { schema: SharedPicklistPublicSchema } },
    },
    ...errors,
  },
});
const deleteRoute = createRoute({
  method: 'delete',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: SharedPicklistPathSchema },
  responses: { 204: { description: 'Shared picklist deleted' }, ...errors },
});

function publicPicklist(row: Awaited<ReturnType<SharedPicklistsService['get']>>) {
  const { authorId: _authorId, authorTeamNumber: _team, ...result } = row;
  void _authorId;
  void _team;
  return result;
}
export function createSharedPicklistsRouter(dependencies: {
  sharedPicklists: SharedPicklistsService;
  authenticator: Authenticator;
}) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.onError(handleErrors);
  router.use('*', dashboardAuth(dependencies.authenticator));
  router.openapi(listRoute, async (c) =>
    c.json(
      {
        picklists: (await dependencies.sharedPicklists.list(c.get('auth').userId)).map(
          publicPicklist
        ),
      },
      200
    )
  );
  router.openapi(getRoute, async (c) =>
    c.json(
      publicPicklist(
        await dependencies.sharedPicklists.get(c.get('auth').userId, c.req.valid('param').uuid)
      ),
      200
    )
  );
  router.openapi(createPicklistRoute, async (c) =>
    c.json(
      publicPicklist(
        await dependencies.sharedPicklists.create(c.get('auth').userId, c.req.valid('json'))
      ),
      201
    )
  );
  router.openapi(updateRoute, async (c) =>
    c.json(
      publicPicklist(
        await dependencies.sharedPicklists.update(
          c.get('auth').userId,
          c.req.valid('param').uuid,
          c.req.valid('json')
        )
      ),
      200
    )
  );
  router.openapi(deleteRoute, async (c) => {
    await dependencies.sharedPicklists.delete(c.get('auth').userId, c.req.valid('param').uuid);
    return c.body(null, 204);
  });
  return router;
}
