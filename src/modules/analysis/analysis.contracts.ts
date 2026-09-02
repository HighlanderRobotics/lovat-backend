import { z } from '@hono/zod-openapi';

export const TeamCategoryPathSchema = z.object({
  teamNumber: z.coerce.number().int().positive(),
});

export const TeamCategoryMetricsSchema = z
  .union([
    z.object({
      totalPoints: z.number(),
      autoPoints: z.number(),
      teleopPoints: z.number(),
      fuelPerSecond: z.number(),
      accuracy: z.number(),
      volleysPerMatch: z.number(),
      l1StartTime: z.number(),
      l2StartTime: z.number(),
      l3StartTime: z.number(),
      autoClimbStartTime: z.number(),
      driverAbility: z.number(),
      contactDefenseTime: z.number(),
      defenseEffectiveness: z.number(),
      campingDefenseTime: z.number(),
      totalDefenseTime: z.number(),
      timeFeeding: z.number(),
      feedingRate: z.number(),
      feedsPerMatch: z.number(),
      totalFuelOutputted: z.number(),
      totalBallsFed: z.number(),
      outpostIntakes: z.number(),
    }),
    z.object({ error: z.enum(['TEAM_DOES_NOT_EXIST', 'NO_DATA_FOR_TEAM']) }),
  ])
  .openapi('TeamCategoryMetrics');
