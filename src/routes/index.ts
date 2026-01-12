import { logger } from '../middleware/logger';
import userRouter from './users.routes';
import { api } from '../openapi/registry';

// Use OpenAPIHono as the central router
const router = api;
router.use('/*', logger);

// Health endpoint
router.get('/health', (c) => c.json({ ok: true }));

// Mount user routes
router.route('/user', userRouter);

// Serve OpenAPI docs centrally at /doc
router.doc('/doc', {
  openapi: '3.1.0',
  info: {
    title: 'Lovat API',
    version: '1.0.0',
  },
});

export default router;
