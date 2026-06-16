import { z } from '@hono/zod-openapi';

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      message: z.string().openapi({ example: 'User not found' }),
      code: z.string().openapi({ example: 'NOT_FOUND' }),
    }),
  })
  .openapi('ErrorResponse');
