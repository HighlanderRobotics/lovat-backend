import { OpenAPIHono } from '@hono/zod-openapi';
import { blockApiKeys, dashboardAuth, combine } from '../../auth/index.js';
import {
  UnauthorizedResponse,
  ForbiddenResponse,
  NotFoundResponse,
} from '../../openapi/responses.js';
import {
  createApiKey,
  createApiKeyParamsSchema,
  createApiKeyResponseSchema,
} from '../../handler/systems/apikey/createApiKey.js';
import {
  renameApiKey,
  renameApiKeyParamsSchema,
  renameApiKeyResponseSchema,
} from '../../handler/systems/apikey/renameApiKey.js';
import { getApiKeys, getApiKeysResponseSchema } from '../../handler/systems/apikey/getApiKeys.js';
import {
  deleteApiKeyParamsSchema,
  deleteApiKeyResponseSchema,
  deleteApiKey,
} from '../../handler/systems/apikey/deleteApiKey.js';

const apikey = new OpenAPIHono();

apikey.use('/*', combine(dashboardAuth(), blockApiKeys()));

apikey.openapi(
  {
    method: 'post',
    path: '/',
    operationId: 'createApiKey',
    tags: ['Systems - API Keys'],
    summary: 'Create a new API key',
    description: 'Generates a new API key for the authenticated user.',
    request: {
      query: createApiKeyParamsSchema,
    },
    responses: {
      200: {
        description: 'API key created successfully',
        content: {
          'application/json': { schema: createApiKeyResponseSchema },
        },
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
      404: NotFoundResponse,
    },
  },
  createApiKey
);

apikey.openapi(
  {
    method: 'delete',
    path: '/',
    operationId: 'deleteApiKey',
    tags: ['Systems - API Keys'],
    summary: 'Delete an existing API key',
    description: 'Deletes an existing API key for the authenticated user.',
    request: {
      query: deleteApiKeyParamsSchema,
    },
    responses: {
      200: {
        description: 'API key deleted successfully',
        content: {
          'application/json': { schema: deleteApiKeyResponseSchema },
        },
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
      404: NotFoundResponse,
    },
  },
  deleteApiKey
);

apikey.openapi(
  {
    method: 'get',
    path: '/',
    operationId: 'getApiKeys',
    tags: ['Systems - API Keys'],
    summary: 'Get all API keys',
    description: 'Retrieves all API keys for the authenticated user.',
    request: {},
    responses: {
      200: {
        description: 'API keys retrieved successfully',
        content: {
          'application/json': { schema: getApiKeysResponseSchema },
        },
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
    },
  },
  getApiKeys
);

apikey.openapi(
  {
    method: 'patch',
    path: '/',
    operationId: 'renameApiKey',
    tags: ['Systems - API Keys'],
    summary: 'Rename an existing API key',
    description: 'Renames an existing API key for the authenticated user.',
    request: {
      query: renameApiKeyParamsSchema,
    },
    responses: {
      200: {
        description: 'API key renamed successfully',
        content: {
          'application/json': { schema: renameApiKeyResponseSchema },
        },
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
      404: NotFoundResponse,
    },
  },
  renameApiKey
);

export const apiKeyRouter = apikey;
