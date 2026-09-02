import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnvironment } from '../../app/context';
import { bearerAuth } from '../../platform/auth/bearer-auth';
import type { Authenticator } from '../../platform/auth/types';
import { ErrorResponseSchema } from '../../platform/http/contracts';
import { BadRequest, handleErrors } from '../../platform/http/errors';
import {
  AllianceAnalysisSchema,
  AllianceQuerySchema,
  MatchPredictionQuerySchema,
  MatchPredictionSchema,
  QualificationRankingPredictionSchema,
  QualificationRankingQuerySchema,
  PicklistAnalysisQuerySchema,
  PicklistAnalysisSchema,
  TeamBreakdownDetailsSchema,
  TeamBreakdownMetricsSchema,
  TeamBreakdownPathSchema,
  TeamCategoryMetricsSchema,
  TeamCategoryPathSchema,
  TeamFlagsQuerySchema,
  TeamFlagsSchema,
  TeamMetricDetailsSchema,
  TeamMetricPathSchema,
} from './analysis.contracts';
import type { AnalysisService } from './analysis.service';
import { picklistWeightNames } from './analysis.service';

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
const flagsRoute = createRoute({
  method: 'get',
  path: '/flag/team/{teamNumber}',
  security: [{ DashboardAuth: [] }],
  request: { params: TeamCategoryPathSchema, query: TeamFlagsQuerySchema },
  responses: {
    200: {
      description: 'Requested team metric and tournament-rank flags in input order',
      content: { 'application/json': { schema: TeamFlagsSchema } },
    },
    400: {
      description: 'Invalid team number or flags',
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
const metricDetailsRoute = createRoute({
  method: 'get',
  path: '/metric/{metric}/team/{teamNumber}',
  security: [{ DashboardAuth: [] }],
  request: { params: TeamMetricPathSchema },
  responses: {
    200: {
      description: 'Team metric timeline and field average, or grouped autonomous paths',
      content: { 'application/json': { schema: TeamMetricDetailsSchema } },
    },
    400: {
      description: 'Invalid team number or metric',
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
const allianceRoute = createRoute({
  method: 'get',
  path: '/alliance',
  security: [{ DashboardAuth: [] }],
  request: { query: AllianceQuerySchema },
  responses: {
    200: {
      description: 'Three-team alliance metrics, roles, climbs, and autonomous paths',
      content: { 'application/json': { schema: AllianceAnalysisSchema } },
    },
    400: {
      description: 'Invalid team numbers',
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
const matchPredictionRoute = createRoute({
  method: 'get',
  path: '/matchprediction',
  security: [{ DashboardAuth: [] }],
  request: { query: MatchPredictionQuerySchema },
  responses: {
    200: {
      description: 'Six-team match win probability and both alliance analyses',
      content: { 'application/json': { schema: MatchPredictionSchema } },
    },
    400: {
      description: 'Invalid team numbers',
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
const qualificationRankingRoute = createRoute({
  method: 'get',
  path: '/qualrankingprediction',
  security: [{ DashboardAuth: [] }],
  request: { query: QualificationRankingQuerySchema },
  responses: {
    200: {
      description: 'Qualification rankings combining completed results and predicted matches',
      content: { 'application/json': { schema: QualificationRankingPredictionSchema } },
    },
    400: {
      description: 'Invalid tournament key',
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
const picklistRoute = createRoute({
  method: 'get',
  path: '/picklist',
  security: [{ DashboardAuth: [] }],
  request: { query: PicklistAnalysisQuerySchema },
  responses: {
    200: {
      description: 'Tournament teams ranked by weighted metric z-scores',
      content: { 'application/json': { schema: PicklistAnalysisSchema } },
    },
    400: {
      description: 'All weights are zero or the event has no teams',
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
  router.openapi(flagsRoute, async (context) => {
    const params = context.req.valid('param');
    const query = context.req.valid('query');
    let flags: string[] = [];
    try {
      const parsed: unknown = JSON.parse(query.flags);
      if (Array.isArray(parsed) && parsed.every((flag) => typeof flag === 'string')) flags = parsed;
    } catch {
      // The legacy endpoint treats malformed JSON as an empty flag list.
    }
    return context.json(
      await dependencies.analysis.flags(
        context.get('auth').userId,
        params.teamNumber,
        flags,
        query.tournamentKey
      ),
      200
    );
  });
  router.openapi(metricDetailsRoute, async (context) => {
    const params = context.req.valid('param');
    return context.json(
      await dependencies.analysis.metricDetails(
        context.get('auth').userId,
        params.teamNumber,
        params.metric
      ),
      200
    );
  });
  router.openapi(allianceRoute, async (context) => {
    const query = context.req.valid('query');
    return context.json(
      await dependencies.analysis.alliance(context.get('auth').userId, [
        query.teamOne,
        query.teamTwo,
        query.teamThree,
      ]),
      200
    );
  });
  router.openapi(matchPredictionRoute, async (context) => {
    const query = context.req.valid('query');
    return context.json(
      await dependencies.analysis.matchPrediction(
        context.get('auth').userId,
        [query.red1, query.red2, query.red3],
        [query.blue1, query.blue2, query.blue3]
      ),
      200
    );
  });
  router.openapi(qualificationRankingRoute, async (context) =>
    context.json(
      await dependencies.analysis.qualificationRankingPrediction(
        context.get('auth').userId,
        context.req.valid('query').tournamentKey
      ),
      200
    )
  );
  router.openapi(picklistRoute, async (context) => {
    const query = context.req.valid('query');
    let flags: string[] = [];
    try {
      const parsed: unknown = JSON.parse(query.flags ?? '[]');
      if (Array.isArray(parsed) && parsed.every((flag) => typeof flag === 'string')) flags = parsed;
    } catch {
      // Legacy behavior treats malformed flag JSON as an empty list.
    }
    const weights = Object.fromEntries(
      picklistWeightNames.map((name) => [name, query[name] ?? 0])
    ) as Record<(typeof picklistWeightNames)[number], number>;
    return context.json(
      await dependencies.analysis.picklist(context.get('auth').userId, {
        tournamentKey: query.tournamentKey,
        flags,
        weights,
      }),
      200
    );
  });
  return router;
}
