import { logger } from '../middleware/logger';
import userRouter from './users.routes';
import { api } from '../openapi/registry';
import openapiDocHandler from '../openapi/doc';

// Use OpenAPIHono as the central router
const router = api;
router.use('/*', logger);

// Health endpoint
router.get('/health', (c) => c.json({ ok: true }));

// Mount user routes
router.route('/user', userRouter);

// Serve OpenAPI docs centrally
const openapiConfig = {
  openapi: '3.1.0',
  info: {
    title: 'Lovat API',
    version: '1.0.0',
  },
};

// Raw OpenAPI JSON
router.get('/openapi.json', (c) => c.json(router.getOpenAPIDocument(openapiConfig)));

// Swagger UI HTML at /doc (loads /v2/openapi.json)
router.get('/doc', openapiDocHandler);

export default router;
