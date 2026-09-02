import { z } from '@hono/zod-openapi';
import { breakdownNames, metricDetailNames } from './analysis.service';

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

export const TeamBreakdownPathSchema = TeamCategoryPathSchema.extend({
  breakdown: z.enum(breakdownNames),
});
export const TeamBreakdownMetricsSchema = z
  .union([
    z.partialRecord(z.enum(breakdownNames), z.record(z.string(), z.number())),
    z.object({ error: z.enum(['TEAM_DOES_NOT_EXIST', 'NO_DATA_FOR_TEAM']) }),
  ])
  .openapi('TeamBreakdownMetrics');
export const TeamBreakdownDetailsSchema = z
  .array(
    z.object({
      key: z.string(),
      tournamentName: z.string(),
      breakdown: z.string(),
      sourceTeam: z.number().int().positive(),
      scouter: z.string().optional(),
    })
  )
  .openapi('TeamBreakdownDetails');

export const TeamFlagsQuerySchema = z.object({
  flags: z.string(),
  tournamentKey: z.string().trim().min(1).optional(),
});
export const TeamFlagsSchema = z.array(z.number().nullable()).openapi('TeamAnalysisFlags');

export const TeamMetricPathSchema = TeamCategoryPathSchema.extend({
  metric: z.enum(metricDetailNames),
});
const MetricTimelinePointSchema = z.object({
  match: z.string(),
  dataPoint: z.number(),
  tournamentName: z.string(),
});
const AutoPathPositionSchema = z.object({
  location: z.number().int().nonnegative(),
  event: z.number().int().nonnegative(),
  time: z.number(),
  quantity: z.number().optional(),
});
export const TeamMetricDetailsSchema = z
  .union([
    z.object({
      array: z.array(MetricTimelinePointSchema),
      result: z.number(),
      all: z.number(),
      difference: z.number(),
      team: z.number().int().positive(),
    }),
    z.object({
      paths: z.array(
        z.object({
          positions: z.array(AutoPathPositionSchema),
          matches: z.array(z.object({ matchKey: z.string(), tournamentName: z.string() })),
          score: z.array(z.number()),
          frequency: z.number().int().positive(),
          maxScore: z.number(),
        })
      ),
    }),
  ])
  .openapi('TeamMetricDetails');

export const AllianceQuerySchema = z.object({
  teamOne: z.coerce.number().int().positive(),
  teamTwo: z.coerce.number().int().positive(),
  teamThree: z.coerce.number().int().positive(),
});
const AutoPathSchema = z.object({
  positions: z.array(AutoPathPositionSchema),
  matches: z.array(z.object({ matchKey: z.string(), tournamentName: z.string() })),
  score: z.array(z.number()),
  frequency: z.number().int().positive(),
  maxScore: z.number(),
});
export const AllianceAnalysisSchema = z
  .object({
    totalPoints: z.number(),
    teams: z
      .array(
        z.object({
          team: z.number().int().positive(),
          role: z.number().int().min(0).max(4),
          averagePoints: z.number(),
          paths: z.array(AutoPathSchema),
        })
      )
      .length(3),
    l1StartTime: z.array(z.number().nullable()).length(3),
    l2StartTime: z.array(z.number().nullable()).length(3),
    l3StartTime: z.array(z.number().nullable()).length(3),
    totalFuelOutputted: z.number(),
    totalBallThroughput: z.number(),
  })
  .openapi('AllianceAnalysis');
