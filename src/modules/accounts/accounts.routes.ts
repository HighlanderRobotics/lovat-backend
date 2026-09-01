import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { assertDashboardIdentity, bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import { assertCanDeleteAccount } from './accounts.policy';
import {
  AccountResponseSchema,
  AccountSettingsSchema,
  AccountSettingsUpdateSchema,
  PromoteScoutingLeadSchema,
  TeamMemberListSchema,
  TeamMemberSchema,
  TeamProfileSchema,
  TeamWebsiteUpdateSchema,
  JoinTeamSchema,
  RegistrationStatusPathSchema,
  RegistrationStatusSchema,
  TeamRegistrationCreatedSchema,
  TeamRegistrationSchema,
} from './accounts.contracts';
import type { AccountsService } from './accounts.service';

type AccountsRouteDependencies = {
  accounts: AccountsService;
  authenticator: Authenticator;
};

function teamMember(account: Awaited<ReturnType<AccountsService['getRequired']>>) {
  return {
    id: account.id,
    teamNumber: account.teamNumber,
    username: account.username,
    email: account.email,
    role: account.role,
  };
}

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

const teamErrors = {
  401: {
    description: 'Authentication required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  403: {
    description: 'Verified team or scouting lead required',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'Account not found',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
} as const;
const listTeamMembersRoute = createRoute({
  method: 'get',
  path: '/team/members',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'Verified team members',
      content: { 'application/json': { schema: TeamMemberListSchema } },
    },
    ...teamErrors,
  },
});
const listAnalystsRoute = createRoute({
  method: 'get',
  path: '/team/analysts',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'Analysts eligible for promotion',
      content: { 'application/json': { schema: TeamMemberListSchema } },
    },
    ...teamErrors,
  },
});
const promoteScoutingLeadRoute = createRoute({
  method: 'post',
  path: '/team/scouting-leads',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: PromoteScoutingLeadSchema } } } },
  responses: {
    200: {
      description: 'Promoted scouting lead',
      content: { 'application/json': { schema: TeamMemberSchema } },
    },
    400: {
      description: 'Invalid request',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    ...teamErrors,
  },
});
const getTeamProfileRoute = createRoute({
  method: 'get',
  path: '/team/profile',
  security: [{ DashboardAuth: [] }],
  responses: {
    200: {
      description: 'Lead-only team contact profile',
      content: { 'application/json': { schema: TeamProfileSchema } },
    },
    ...teamErrors,
  },
});
const updateTeamWebsiteRoute = createRoute({
  method: 'patch',
  path: '/team/website',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: TeamWebsiteUpdateSchema } } } },
  responses: {
    200: {
      description: 'Updated team profile',
      content: { 'application/json': { schema: TeamProfileSchema } },
    },
    400: {
      description: 'Invalid website',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    ...teamErrors,
  },
});
const registerTeamRoute = createRoute({
  method: 'post',
  path: '/team/registration',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: TeamRegistrationSchema } } } },
  responses: {
    201: {
      description: 'Team registration started',
      content: { 'application/json': { schema: TeamRegistrationCreatedSchema } },
    },
    400: {
      description: 'Invalid or duplicate team',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    ...teamErrors,
  },
});
const joinTeamRoute = createRoute({
  method: 'post',
  path: '/team/join',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: JoinTeamSchema } } } },
  responses: {
    200: {
      description: 'Joined registered team',
      content: { 'application/json': { schema: AccountResponseSchema } },
    },
    400: {
      description: 'Invalid request',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    ...teamErrors,
  },
});
const registrationStatusRoute = createRoute({
  method: 'get',
  path: '/team/{number}/registration-status',
  security: [{ DashboardAuth: [] }],
  request: { params: RegistrationStatusPathSchema },
  responses: {
    200: {
      description: 'Registration lifecycle status',
      content: { 'application/json': { schema: RegistrationStatusSchema } },
    },
    400: {
      description: 'Invalid team number',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    ...teamErrors,
  },
});

export function createAccountsRouter(dependencies: AccountsRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.use('*', bearerAuth(dependencies.authenticator));

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
    assertDashboardIdentity(identity);
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
    assertDashboardIdentity(context.get('auth'));
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

  router.openapi(listTeamMembersRoute, async (context) =>
    context.json(
      {
        members: (await dependencies.accounts.listTeamMembers(context.get('auth').userId)).map(
          teamMember
        ),
      },
      200
    )
  );
  router.openapi(listAnalystsRoute, async (context) =>
    context.json(
      {
        members: (await dependencies.accounts.listAnalysts(context.get('auth').userId)).map(
          teamMember
        ),
      },
      200
    )
  );
  router.openapi(promoteScoutingLeadRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    const account = await dependencies.accounts.promoteToScoutingLead(
      context.get('auth').userId,
      context.req.valid('json').userId
    );
    return context.json(teamMember(account), 200);
  });
  router.openapi(getTeamProfileRoute, async (context) =>
    context.json(await dependencies.accounts.getTeamProfile(context.get('auth').userId), 200)
  );
  router.openapi(updateTeamWebsiteRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    return context.json(
      await dependencies.accounts.updateTeamWebsite(
        context.get('auth').userId,
        context.req.valid('json').website
      ),
      200
    );
  });
  router.openapi(registerTeamRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    return context.json(
      await dependencies.accounts.registerTeam(
        context.get('auth').userId,
        context.req.valid('json')
      ),
      201
    );
  });
  router.openapi(joinTeamRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    const account = await dependencies.accounts.joinTeam(
      context.get('auth').userId,
      context.req.valid('json')
    );
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
  router.openapi(registrationStatusRoute, async (context) =>
    context.json(
      await dependencies.accounts.getRegistrationStatus(
        context.get('auth').userId,
        context.req.valid('param').number
      ),
      200
    )
  );

  return router;
}
