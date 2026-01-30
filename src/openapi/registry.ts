import { OpenAPIHono } from '@hono/zod-openapi';
export const api = new OpenAPIHono();
export * from './examples';

// Re-export all schemas for route validators to import
export * from './schemas';
export * from './responses';
