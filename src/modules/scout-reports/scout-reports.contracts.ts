import { z } from '@hono/zod-openapi';
import { EventSchema, ScoutReportSchema } from '../../platform/database/schemas';

export const ScoutReportPathSchema = z.object({ uuid: z.uuid() });

export const LegacyEventTupleSchema = z
  .array(z.number())
  .min(3)
  .max(4)
  .openapi('LegacyScoutEventTuple');

export const ScoutReportCreateSchema = z
  .object({
    uuid: z.uuid(),
    tournamentKey: z.string().min(1),
    matchType: z.enum(['QUALIFICATION', 'ELIMINATION']),
    matchNumber: z.number().int().positive(),
    startTime: z.number().finite(),
    notes: z.string(),
    robotRoles: z.array(z.enum(['CYCLING', 'SCORING', 'FEEDING', 'DEFENDING', 'IMMOBILE'])),
    mobility: z.enum(['TRENCH', 'BUMP', 'BOTH', 'NONE']),
    climbPosition: z.enum(['SIDE', 'MIDDLE']).nullish(),
    climbSide: z.enum(['FRONT', 'BACK']).nullish(),
    beached: z.enum(['ON_FUEL', 'ON_BUMP', 'BOTH', 'NEITHER']),
    feederTypes: z.array(z.enum(['CONTINUOUS', 'STOP_TO_SHOOT', 'DUMP'])),
    intakeType: z.enum(['GROUND', 'OUTPOST', 'BOTH', 'NEITHER']),
    robotBrokeDescription: z.string().nullish(),
    driverAbility: z.number().int(),
    accuracy: z.number().int().nullable().optional(),
    disrupts: z.boolean(),
    defenseEffectiveness: z.number().int(),
    scoresWhileMoving: z.boolean(),
    autoClimb: z.enum(['NOT_ATTEMPTED', 'FAILED', 'SUCCEEDED']),
    endgameClimb: z.enum(['NOT_ATTEMPTED', 'FAILED', 'L1', 'L2', 'L3']),
    scouterUuid: z.uuid(),
    teamNumber: z.number().int().positive(),
    appVersion: z.string().optional(),
    events: z.array(LegacyEventTupleSchema),
  })
  .openapi('ScoutReportCreate');
export const ScoutReportCreatedSchema = z.object({ uuid: z.uuid() }).openapi('ScoutReportCreated');

export const ScoutReportPublicSchema = ScoutReportSchema.extend({
  scouterName: z.string().nullable().optional(),
}).openapi('ScoutReportPublic');

export const ScoutReportResponseSchema = z
  .object({
    scoutReport: ScoutReportPublicSchema,
    events: z.array(EventSchema),
    canModify: z.boolean(),
  })
  .openapi('ScoutReportResponse');

export const ScoutReportNotesSchema = z
  .object({ note: z.string() })
  .openapi('ScoutReportNotesUpdate');

export const ScoutReportTimelineSchema = z
  .array(
    z.union([
      z.tuple([z.number(), z.number(), z.number()]),
      z.tuple([z.number(), z.number(), z.number(), z.number()]),
    ])
  )
  .openapi('ScoutReportTimeline');
export const MatchScoutReportsPathSchema = z.object({
  matchKey: z.string().trim().min(1).max(100),
});
export const MatchScoutReportSummarySchema = z.object({
  uuid: z.uuid(),
  scouterUuid: z.uuid(),
  notes: z.string(),
  startTime: z.iso.datetime(),
  robotBrokeDescription: z.string().nullable(),
  scouter: z.object({ name: z.string().nullable(), sourceTeamNumber: z.number().int().positive() }),
  canModify: z.boolean(),
});
export const MatchScoutReportsSchema = z
  .array(MatchScoutReportSummarySchema)
  .openapi('MatchScoutReports');
export const ScoutReportMetricsSchema = z
  .object({
    totalPoints: z.number(),
    driverAbility: z.number().int(),
    accuracy: z.number().int().nullable(),
    totalBallsFed: z.number(),
    volleys: z.number().int().nonnegative(),
    defenseEffectiveness: z.number().int(),
    robotRoles: z.array(z.number().int().nonnegative()),
    climb: z.number().int().nonnegative(),
    autoClimb: z.number().int().nonnegative(),
    autoClimbStartTime: z.number(),
    contactDefenseTime: z.number(),
    campingDefenseTime: z.number(),
    totalDefenseTime: z.number(),
    scoringRate: z.number(),
    feedingRate: z.number(),
    feeds: z.number().int().nonnegative(),
    feederType: z.array(z.number().int().nonnegative()),
    climbResult: z.number().int().nonnegative(),
    climbStartTime: z.number(),
    autoPath: z.object({
      autoPoints: z.number(),
      positions: z.array(
        z.object({
          location: z.number().int().nonnegative(),
          event: z.number().int().nonnegative(),
          time: z.number(),
          quantity: z.number(),
        })
      ),
      match: z.string(),
      tournamentName: z.string(),
      climb: z.number().int().nonnegative(),
    }),
    note: z.string(),
    robotBrokeDescription: z.string().nullable(),
    timeStamp: z.iso.datetime(),
  })
  .openapi('ScoutReportMetrics');
