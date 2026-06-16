import { logger } from '../middleware/logger';
import userRouter from './users.routes';
import { api } from '../openapi/registry';
import openapiDocHandler from '../openapi/doc';
import { handleErrors } from '../middleware/error';
import { version } from 'bun';
import { securitySchemes } from '../openapi/security';
import { errorExamplesComponents } from '../openapi/examples';
import { etag } from '../middleware/etag';

// Use OpenAPIHono as the central router
const router = api;
router.onError(handleErrors);
router.use('/*', logger);
router.use('/*', etag);

// Health endpoint
router.get('/health', (c) => c.json({ ok: true }));

// Mount user routes
router.route('/user', userRouter);

// Serve OpenAPI docs centrally
const openapiConfig = {
  openapi: '3.1.0',
  info: {
    title: 'Lovat API',
    version: version,
  },
  components: {
    securitySchemes,
    examples: errorExamplesComponents as any,
  },
  security: [{ DashboardAuth: [] }, { ApiKeyAuth: [] }] as any,
};

// Raw OpenAPI JSON
router.get('/openapi.json', (c) => c.json(router.getOpenAPIDocument(openapiConfig)));

// Swagger UI HTML at /doc (loads /v2/openapi.json)
router.get('/doc', openapiDocHandler);

router.get('/debug', (c) => {
  return c.json(
    router.routes.map((r) => ({
      path: r.path,
      method: r.method,
    }))
  );
});

router.notFound((c) => {
  console.log('NOT FOUND:', c.req.method, c.req.path);
  return c.json({ error: 'not found' }, 404);
});

export default router;
