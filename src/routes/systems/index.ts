import { OpenAPIHono } from '@hono/zod-openapi';
import { apiKeyRouter } from './apikey.routes.js';

const systems = new OpenAPIHono();

systems.route('/apikey', apiKeyRouter);
systems.route('/apikey/', apiKeyRouter);

export default systems;
