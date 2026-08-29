import { z } from '@hono/zod-openapi';

export const AccountResponseSchema = z
  .object({
    id: z.string(),
    teamNumber: z.number().int().nullable(),
    email: z.string().email(),
    emailVerified: z.boolean(),
    username: z.string().nullable(),
    role: z.enum(['MEMBER', 'ADMIN', 'OWNER']),
  })
  .openapi('Account');

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('ErrorResponse');
