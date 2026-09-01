import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { assertDashboardIdentity, bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest } from '../../platform/http/errors';
import {
  ScouterCreateBodySchema,
  ScouterListQuerySchema,
  ScouterListResponseSchema,
  ScouterPathSchema,
  ScouterPublicSchema,
  ScouterUpdateBodySchema,
  TeamCodeCheckResponseSchema,
  TeamCodeHeaderSchema,
  TeamCodeQuerySchema,
} from './scouters.contracts';
import type { ScoutersService } from './scouters.service';

type ScoutersRouteDependencies = {
  scouters: ScoutersService;
  authenticator: Authenticator;
};

const errorResponse = {
  content: { 'application/json': { schema: ErrorResponseSchema } },
} as const;

const sharedErrors = {
  400: { description: 'Invalid request', ...errorResponse },
  401: { description: 'Authentication required', ...errorResponse },
  403: { description: 'A verified team and sufficient permission are required', ...errorResponse },
  404: { description: 'Account or scouter not found', ...errorResponse },
} as const;

const checkTeamCodeRoute = createRoute({
  method: 'get',
  path: '/team-code',
  request: { query: TeamCodeQuerySchema },
  responses: {
    200: {
      description: 'Whether the team code is registered',
      content: { 'application/json': { schema: TeamCodeCheckResponseSchema } },
    },
    400: { description: 'Invalid code', ...errorResponse },
  },
});
const publicRosterRoute = createRoute({
  method: 'get',
  path: '/public',
  request: { headers: TeamCodeHeaderSchema },
  responses: {
    200: {
      description: 'Active scouters for the team code',
      content: { 'application/json': { schema: ScouterListResponseSchema } },
    },
    400: { description: 'Invalid code', ...errorResponse },
    404: { description: 'Team code not found', ...errorResponse },
  },
});

const listScoutersRoute = createRoute({
  method: 'get',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { query: ScouterListQuerySchema },
  responses: {
    200: {
      description: 'The authenticated account team’s scouter roster',
      content: { 'application/json': { schema: ScouterListResponseSchema } },
    },
    ...sharedErrors,
  },
});

const createScouterRoute = createRoute({
  method: 'post',
  path: '/',
  security: [{ DashboardAuth: [] }],
  request: { body: { content: { 'application/json': { schema: ScouterCreateBodySchema } } } },
  responses: {
    201: {
      description: 'Scouter created',
      content: { 'application/json': { schema: ScouterPublicSchema } },
    },
    ...sharedErrors,
  },
});

const updateScouterRoute = createRoute({
  method: 'patch',
  path: '/{uuid}',
  security: [{ DashboardAuth: [] }],
  request: {
    params: ScouterPathSchema,
    body: { content: { 'application/json': { schema: ScouterUpdateBodySchema } } },
  },
  responses: {
    200: {
      description: 'Scouter updated',
      content: { 'application/json': { schema: ScouterPublicSchema } },
    },
    ...sharedErrors,
  },
});

export function createScoutersRouter(dependencies: ScoutersRouteDependencies) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.openapi(checkTeamCodeRoute, async (context) =>
    context.json(await dependencies.scouters.checkTeamCode(context.req.valid('query').code), 200)
  );
  router.openapi(publicRosterRoute, async (context) =>
    context.json(
      {
        scouters: await dependencies.scouters.listByTeamCode(
          context.req.valid('header')['x-team-code']
        ),
      },
      200
    )
  );
  router.use('*', bearerAuth(dependencies.authenticator));

  router.openapi(listScoutersRoute, async (context) => {
    const { archived } = context.req.valid('query');
    const scouters = await dependencies.scouters.list(context.get('auth').userId, archived);
    return context.json({ scouters }, 200);
  });

  router.openapi(createScouterRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    const { name } = context.req.valid('json');
    const scouter = await dependencies.scouters.create(context.get('auth').userId, name);
    return context.json(scouter, 201);
  });

  router.openapi(updateScouterRoute, async (context) => {
    assertDashboardIdentity(context.get('auth'));
    const { uuid } = context.req.valid('param');
    const changes = context.req.valid('json');
    const scouter = await dependencies.scouters.update(context.get('auth').userId, uuid, changes);
    return context.json(scouter, 200);
  });

  return router;
}
