import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { assertDashboardIdentity, bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import {
  MutablePicklistListSchema,
  MutablePicklistPathSchema,
  MutablePicklistPublicSchema,
  MutablePicklistWriteSchema,
} from './mutable-picklists.contracts';
import type { MutablePicklistsService } from './mutable-picklists.service';

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
    description: 'Verified team access required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'Picklist not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;
const listRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'Team mutable picklists',
      content: { 'application/json': { schema: MutablePicklistListSchema } },
    },
    ...errors,
  },
});
const getRoute = createRoute({
  method: 'get',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: MutablePicklistPathSchema },
  responses: {
    200: {
      description: 'Mutable picklist',
      content: { 'application/json': { schema: MutablePicklistPublicSchema } },
    },
    ...errors,
  },
});
const createPicklistRoute = createRoute({
  method: 'post',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: MutablePicklistWriteSchema } } } },
  responses: {
    201: {
      description: 'Mutable picklist created',
      content: { 'application/json': { schema: MutablePicklistPublicSchema } },
    },
    ...errors,
  },
});
const updateRoute = createRoute({
  method: 'put',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: {
    params: MutablePicklistPathSchema,
    body: { content: { 'application/json': { schema: MutablePicklistWriteSchema } } },
  },
  responses: {
    200: {
      description: 'Mutable picklist updated',
      content: { 'application/json': { schema: MutablePicklistPublicSchema } },
    },
    ...errors,
  },
});
const deleteRoute = createRoute({
  method: 'delete',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: MutablePicklistPathSchema },
  responses: { 204: { description: 'Mutable picklist deleted' }, ...errors },
});

function publicPicklist({
  authorId: _authorId,
  authorTeamNumber: _team,
  ...picklist
}: Awaited<ReturnType<MutablePicklistsService['get']>>) {
  return picklist;
}
export function createMutablePicklistsRouter(dependencies: {
  mutablePicklists: MutablePicklistsService;
  authenticator: Authenticator;
}) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.onError(handleErrors);
  router.use('*', bearerAuth(dependencies.authenticator));
  router.openapi(listRoute, async (c) =>
    c.json({ picklists: await dependencies.mutablePicklists.list(c.get('auth').userId) }, 200)
  );
  router.openapi(getRoute, async (c) =>
    c.json(
      publicPicklist(
        await dependencies.mutablePicklists.get(c.get('auth').userId, c.req.valid('param').uuid)
      ),
      200
    )
  );
  router.openapi(createPicklistRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    return c.json(
      publicPicklist(
        await dependencies.mutablePicklists.create(c.get('auth').userId, c.req.valid('json'))
      ),
      201
    );
  });
  router.openapi(updateRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    return c.json(
      publicPicklist(
        await dependencies.mutablePicklists.update(
          c.get('auth').userId,
          c.req.valid('param').uuid,
          c.req.valid('json')
        )
      ),
      200
    );
  });
  router.openapi(deleteRoute, async (c) => {
    assertDashboardIdentity(c.get('auth'));
    await dependencies.mutablePicklists.delete(c.get('auth').userId, c.req.valid('param').uuid);
    return c.body(null, 204);
  });
  return router;
}
