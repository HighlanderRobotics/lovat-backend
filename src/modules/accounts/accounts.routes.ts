import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { dashboardAuth } from '../../platform/auth/dashboard-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import { assertCanDeleteAccount } from './accounts.policy';
import {
  AccountResponseSchema,
  AccountSettingsSchema,
  AccountSettingsUpdateSchema,
} from './accounts.contracts';
import type { AccountsService } from './accounts.service';

type AccountsRouteDependencies = {
  accounts: AccountsService;
  authenticator: Authenticator;
};

const getCurrentAccountRoute = createRoute({
  method: 'get',
  path: '/me',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'The authenticated account',
      content: { 'application/json': { schema: AccountResponseSchema } },
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

const deleteCurrentAccountRoute = createRoute({
  method: 'delete',
  path: '/me',
  security: [{ DashboardAuth: [] }],
  responses: {
    204: { description: 'Account deleted' },
    401: {
      description: 'Authentication required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: 'Deletion is forbidden',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'Account not found',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

const getAccountSettingsRoute = createRoute({
  method: 'get',
  path: '/me/settings',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'The authenticated account settings',
      content: { 'application/json': { schema: AccountSettingsSchema } },
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

const updateAccountSettingsRoute = createRoute({
  method: 'patch',
  path: '/me/settings',
  security: [{ DashboardAuth: [] }],
  request: {
    body: { content: { 'application/json': { schema: AccountSettingsUpdateSchema } } },
  },
  responses: {
    200: {
      description: 'Updated account settings',
      content: { 'application/json': { schema: AccountSettingsSchema } },
    },
    400: {
      description: 'Invalid settings',
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

export function createAccountsRouter(dependencies: AccountsRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.use('*', dashboardAuth(dependencies.authenticator));

  router.openapi(getCurrentAccountRoute, async (context) => {
    const identity = context.get('auth');
    const account = await dependencies.accounts.getRequired(identity.userId);
    return context.json(
      {
        id: account.id,
        teamNumber: account.teamNumber,
        email: account.email,
        emailVerified: account.emailVerified,
        username: account.username,
        role: account.role,
      },
      200
    );
  });

  router.openapi(deleteCurrentAccountRoute, async (context) => {
    const identity = context.get('auth');
    assertCanDeleteAccount(identity, identity.userId);
    await dependencies.accounts.delete(identity.userId);
    return context.body(null, 204);
  });

  router.openapi(getAccountSettingsRoute, async (context) => {
    const account = await dependencies.accounts.getRequired(context.get('auth').userId);
    return context.json(
      {
        username: account.username,
        teamSourceRule: account.teamSourceRule,
        tournamentSourceRule: account.tournamentSourceRule,
      },
      200
    );
  });

  router.openapi(updateAccountSettingsRoute, async (context) => {
    const account = await dependencies.accounts.updateSettings(
      context.get('auth').userId,
      context.req.valid('json')
    );
    return context.json(
      {
        username: account.username,
        teamSourceRule: account.teamSourceRule,
        tournamentSourceRule: account.tournamentSourceRule,
      },
      200
    );
  });

  return router;
}
