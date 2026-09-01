import { z } from '@hono/zod-openapi';
import { MutablePicklistSchema } from '../../platform/database/schemas';

export const MutablePicklistPublicSchema = MutablePicklistSchema.extend({
  authorUsername: z.string().nullable(),
})
  .omit({ authorId: true })
  .openapi('MutablePicklistSummary');
export const MutablePicklistListSchema = z
  .object({ picklists: z.array(MutablePicklistPublicSchema) })
  .openapi('MutablePicklistList');
export const MutablePicklistPathSchema = z.object({ uuid: z.uuid() });
export const MutablePicklistWriteSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    teams: z.array(z.number().int().positive()).max(100),
    tournamentKey: z.string().min(1).nullable().optional(),
  })
  .openapi('MutablePicklistWrite');
