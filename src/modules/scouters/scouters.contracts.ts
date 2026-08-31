import { z } from '@hono/zod-openapi';
import {
  ScouterInsertSchema,
  ScouterSchema,
  ScouterUpdateSchema,
} from '../../platform/database/schemas';

const ScouterNameSchema = z.string().trim().min(1).max(100);

export const ScouterPublicSchema = ScouterSchema.pick({
  uuid: true,
  name: true,
  archived: true,
}).openapi('ScouterSummary');

export const ScouterListQuerySchema = z
  .object({
    archived: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  })
  .openapi('ScouterListQuery');

export const ScouterListResponseSchema = z
  .object({ scouters: z.array(ScouterPublicSchema) })
  .openapi('ScouterListResponse');

export const ScouterCreateBodySchema = ScouterInsertSchema.pick({ name: true })
  .extend({ name: ScouterNameSchema })
  .openapi('ScouterCreateBody');

export const ScouterPathSchema = ScouterSchema.pick({ uuid: true })
  .extend({ uuid: z.uuid() })
  .openapi('ScouterPath');

export const ScouterUpdateBodySchema = ScouterUpdateSchema.pick({ name: true, archived: true })
  .extend({ name: ScouterNameSchema.optional(), archived: z.boolean().optional() })
  .refine((value) => value.name !== undefined || value.archived !== undefined, {
    message: 'At least one change is required',
  })
  .openapi('ScouterUpdateBody');
