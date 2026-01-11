import { OpenAPIHono } from '@hono/zod-openapi';
export const api = new OpenAPIHono();

// Re-export all schemas for route validators to import
export * from './schemas';
