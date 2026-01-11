import { z } from '@hono/zod-openapi';

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({ example: 'User not found' }),
  })
  .openapi('ErrorResponse');
