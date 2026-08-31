import { z } from '@hono/zod-openapi';
import { TeamSchema } from '../../platform/database/schemas';

export const TeamListQuerySchema = z
  .object({
    filter: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .openapi('TeamListQuery');

export const TeamListResponseSchema = z
  .object({
    teams: z.array(TeamSchema),
    count: z.number().int().min(0),
  })
  .openapi('TeamListResponse');
