import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { dashboardAuth } from '../../platform/auth/dashboard-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import {
  ApiKeyCreateBodySchema,
  ApiKeyCreateResponseSchema,
  ApiKeyListResponseSchema,
  ApiKeyPathSchema,
  ApiKeyRenameBodySchema,
} from './api-keys.contracts';
import type { ApiKeysService } from './api-keys.service';

type ApiKeysRouteDependencies = {
  apiKeys: ApiKeysService;
  authenticator: Authenticator;
};

const commonErrors = {
  401: {
    description: 'Authentication required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'Account or API key not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  403: {
    description: 'A verified team and permission to manage the key are required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;

const validationError = {
  400: {
    description: 'Invalid request',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;

const listApiKeysRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'API keys visible to the authenticated account',
      content: { 'application/json': { schema: ApiKeyListResponseSchema } },
    },
    ...commonErrors,
  },
});

const createApiKeyRoute = createRoute({
  method: 'post',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: ApiKeyCreateBodySchema } } },
  },
  responses: {
    201: {
      description: 'API key created; the secret is only returned once',
      content: { 'application/json': { schema: ApiKeyCreateResponseSchema } },
    },
    ...validationError,
    ...commonErrors,
  },
});

const renameApiKeyRoute = createRoute({
  method: 'patch',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: {
    params: ApiKeyPathSchema,
    body: { content: { 'application/json': { schema: ApiKeyRenameBodySchema } } },
  },
  responses: {
    204: { description: 'API key renamed' },
    ...validationError,
    ...commonErrors,
  },
});

const revokeApiKeyRoute = createRoute({
  method: 'delete',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: { params: ApiKeyPathSchema },
  responses: {
    204: { description: 'API key revoked' },
    ...validationError,
    ...commonErrors,
  },
});

export function createApiKeysRouter(dependencies: ApiKeysRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.use('*', dashboardAuth(dependencies.authenticator));

  router.openapi(listApiKeysRoute, async (context) => {
    const apiKeys = await dependencies.apiKeys.list(context.get('auth').userId);
    return context.json({ apiKeys }, 200);
  });

  router.openapi(createApiKeyRoute, async (context) => {
    const { name } = context.req.valid('json');
    const apiKey = await dependencies.apiKeys.create(context.get('auth').userId, name);
    return context.json({ apiKey }, 201);
  });

  router.openapi(renameApiKeyRoute, async (context) => {
    const { uuid } = context.req.valid('param');
    const { name } = context.req.valid('json');
    await dependencies.apiKeys.rename(context.get('auth').userId, uuid, name);
    return context.body(null, 204);
  });

  router.openapi(revokeApiKeyRoute, async (context) => {
    const { uuid } = context.req.valid('param');
    await dependencies.apiKeys.revoke(context.get('auth').userId, uuid);
    return context.body(null, 204);
  });

  return router;
}
