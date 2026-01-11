import { z } from '@hono/zod-openapi';
import {
  RobotRole,
  AlgaePickup,
  CoralPickup,
  BargeResult,
  KnocksAlgae,
  UnderShallowCage,
  EventAction,
  Position,
} from './enums';

export const ScoutReportSchema = z
  .object({
    uuid: z.string().openapi({ example: 'rpt_123' }),
    teamMatchKey: z.string().openapi({ example: '2024cafr_qm24_8033' }),
    startTime: z.string().openapi({ example: '2024-10-01T12:00:00Z' }),
    notes: z.string().openapi({ example: 'Great driver performance.' }),
    robotRole: RobotRole.openapi({ example: 'OFFENSE' }),
    algaePickup: AlgaePickup.openapi({ example: 'GROUND' }),
    coralPickup: CoralPickup.openapi({ example: 'STATION' }),
    bargeResult: BargeResult.openapi({ example: 'SHALLOW' }),
    knocksAlgae: KnocksAlgae.openapi({ example: 'YES' }),
    underShallowCage: UnderShallowCage.openapi({ example: 'NO' }),
    robotBrokeDescription: z.string().nullable().openapi({ example: null }),
    driverAbility: z.number().int().openapi({ example: 8 }),
    scouterUuid: z.string().openapi({ example: 'sc_123' }),
  })
  .openapi('ScoutReport');

export const EventSchema = z
  .object({
    eventUuid: z.string().openapi({ example: 'ev_123' }),
    time: z.number().int().openapi({ example: 42 }),
    action: EventAction.openapi({ example: 'SCORE_CORAL' }),
    position: Position.openapi({ example: 'LEVEL_TWO_B' }),
    points: z.number().int().openapi({ example: 3 }),
    scoutReportUuid: z.string().openapi({ example: 'rpt_123' }),
  })
  .openapi('Event');

export const ScouterSchema = z
  .object({
    uuid: z.string().openapi({ example: 'sc_123' }),
    name: z.string().nullable().openapi({ example: 'Jane' }),
    archived: z.boolean().openapi({ example: false }),
    sourceTeamNumber: z.number().int().openapi({ example: 8033 }),
    strikes: z.number().int().openapi({ example: 0 }),
    scouterReliability: z.number().int().openapi({ example: 5 }),
  })
  .openapi('Scouter');

export const ScouterScheduleShiftSchema = z
  .object({
    uuid: z.string().openapi({ example: 'shift_123' }),
    sourceTeamNumber: z.number().int().openapi({ example: 8033 }),
    tournamentKey: z.string().openapi({ example: '2024cafr' }),
    startMatchOrdinalNumber: z.number().int().openapi({ example: 1 }),
    endMatchOrdinalNumber: z.number().int().openapi({ example: 10 }),
  })
  .openapi('ScouterScheduleShift');

export type ScoutReport = z.infer<typeof ScoutReportSchema>;
export type Event = z.infer<typeof EventSchema>;
export type Scouter = z.infer<typeof ScouterSchema>;
export type ScouterScheduleShift = z.infer<typeof ScouterScheduleShiftSchema>;
