import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import {
  TeamBreakdownDetailsSchema,
  TeamBreakdownMetricsSchema,
  TeamBreakdownPathSchema,
  TeamCategoryMetricsSchema,
  TeamCategoryPathSchema,
} from './analysis.contracts';
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
const breakdownRoute = createRoute({
  method: 'get',
  path: '/breakdown/team/{teamNumber}',
  security: [{ DashboardAuth: [] }],
  request: { params: TeamCategoryPathSchema },
  responses: {
    200: {
      description: 'Data-source-filtered discrete scout report breakdowns',
      content: { 'application/json': { schema: TeamBreakdownMetricsSchema } },
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
const breakdownDetailsRoute = createRoute({
  method: 'get',
  path: '/breakdown/team/{teamNumber}/{breakdown}',
  security: [{ DashboardAuth: [] }],
  request: { params: TeamBreakdownPathSchema },
  responses: {
    200: {
      description: 'Report-level values for one discrete scout report breakdown',
      content: { 'application/json': { schema: TeamBreakdownDetailsSchema } },
    },
    400: {
      description: 'Invalid team number or breakdown',
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
  router.openapi(breakdownRoute, async (context) =>
    context.json(
      await dependencies.analysis.breakdownMetrics(
        context.get('auth').userId,
        context.req.valid('param').teamNumber
      ),
      200
    )
  );
  router.openapi(breakdownDetailsRoute, async (context) => {
    const params = context.req.valid('param');
    return context.json(
      await dependencies.analysis.breakdownDetails(
        context.get('auth').userId,
        params.teamNumber,
        params.breakdown
      ),
      200
    );
  });
  return router;
}
