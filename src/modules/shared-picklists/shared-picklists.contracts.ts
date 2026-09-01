import { z } from '@hono/zod-openapi';
import { SharedPicklistSchema } from '../../platform/database/schemas';

export const SharedPicklistPathSchema = z.object({ uuid: z.uuid() });
const metricFields = {
  totalPoints: z.number().default(0),
  autoPoints: z.number().default(0),
  teleopPoints: z.number().default(0),
  climbResult: z.number().default(0),
  autoClimb: z.number().default(0),
  defenseEffectiveness: z.number().default(0),
  contactDefenseTime: z.number().default(0),
  campingDefenseTime: z.number().default(0),
  totalDefensiveTime: z.number().default(0),
  totalFuelThroughput: z.number().default(0),
  totalFuelFed: z.number().default(0),
  feedingRate: z.number().default(0),
  scoringRate: z.number().default(0),
  estimatedSuccessfulFuelRate: z.number().default(0),
  estimatedTotalFuelScored: z.number().default(0),
  driverAbility: z.number().default(0),
};
export const SharedPicklistWriteSchema = z
  .object({ name: z.string().trim().min(1).max(100), ...metricFields })
  .openapi('SharedPicklistWrite');
export const SharedPicklistPublicSchema = SharedPicklistSchema.omit({ authorId: true })
  .extend({ authorUsername: z.string().nullable() })
  .openapi('SharedPicklist');
export const SharedPicklistListSchema = z
  .object({ picklists: z.array(SharedPicklistPublicSchema) })
  .openapi('SharedPicklistList');
