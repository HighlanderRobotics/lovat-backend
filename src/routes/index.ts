import { Hono } from 'hono';
import { logger } from '../middleware/logger';

const router = new Hono();
router.use('/*', logger);

router.get('/health', (c) => c.json({ ok: true }));

export default router;
