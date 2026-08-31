import { z } from '@hono/zod-openapi';
import { TeamSchema, TournamentSchema } from '../../platform/database/schemas';

export const TournamentSummarySchema = TournamentSchema.extend({
  isParticipant: z.boolean(),
}).openapi('TournamentSummary');

export const TournamentListQuerySchema = z
  .object({
    filter: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .openapi('TournamentListQuery');

export const TournamentListResponseSchema = z
  .object({
    tournaments: z.array(TournamentSummarySchema),
    count: z.number().int().min(0),
  })
  .openapi('TournamentListResponse');

export const TournamentPathSchema = TournamentSchema.pick({ key: true })
  .extend({ key: z.string().trim().min(1).max(50) })
  .openapi('TournamentPath');

export const TournamentTeamsResponseSchema = z
  .object({ teams: z.array(TeamSchema) })
  .openapi('TournamentTeamsResponse');
