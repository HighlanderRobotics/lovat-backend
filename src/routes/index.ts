import { Hono } from 'hono';
import { logger } from '../middleware/logger';
import userRouter from './users.routes';

const router = new Hono();
router.use('/*', logger);

router.get('/health', (c) => c.json({ ok: true }));

router.route('/user', userRouter);

export default router;
