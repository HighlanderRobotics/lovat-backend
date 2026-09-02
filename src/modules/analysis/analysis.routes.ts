import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import { TeamCategoryMetricsSchema, TeamCategoryPathSchema } from './analysis.contracts';
import type { AnalysisService } from './analysis.service';

const categoryRoute = createRoute({
  method: 'get',
  path: '/category/team/{teamNumber}',
  security: [{ DashboardAuth: [] }],
  request: { params: TeamCategoryPathSchema },
  responses: {
    200: {
      description: 'Data-source-filtered legacy category metrics for a team',
      content: { 'application/json': { schema: TeamCategoryMetricsSchema } },
    },
    400: {
      description: 'Invalid team number',
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

export function createAnalysisRouter(dependencies: {
  analysis: AnalysisService;
  authenticator: Authenticator;
}) {
  const router = new OpenAPIHono<AppEnvironment>({
    defaultHook(result) {
      if (!result.success) throw new BadRequest();
    },
  });
  router.onError(handleErrors);
  router.use('*', bearerAuth(dependencies.authenticator));
  router.openapi(categoryRoute, async (context) =>
    context.json(
      await dependencies.analysis.categoryMetrics(
        context.get('auth').userId,
        context.req.valid('param').teamNumber
      ),
      200
    )
  );
  return router;
}
