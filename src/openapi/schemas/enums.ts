import { z } from '@hono/zod-openapi';

export const Position = z
  .enum([
    'NONE',
    'START_ONE',
    'START_TWO',
    'START_THREE',
    'START_FOUR',
    'LEVEL_ONE',
    'LEVEL_TWO',
    'LEVEL_THREE',
    'LEVEL_FOUR',
    'LEVEL_ONE_A',
    'LEVEL_ONE_B',
    'LEVEL_ONE_C',
    'LEVEL_TWO_A',
    'LEVEL_TWO_B',
    'LEVEL_TWO_C',
    'LEVEL_THREE_A',
    'LEVEL_THREE_B',
    'LEVEL_THREE_C',
    'LEVEL_FOUR_A',
    'LEVEL_FOUR_B',
    'LEVEL_FOUR_C',
    'GROUND_PIECE_A',
    'GROUND_PIECE_B',
    'GROUND_PIECE_C',
    'CORAL_STATION_ONE',
    'CORAL_STATION_TWO',
  ])
  .openapi('Position');

export const EventAction = z
  .enum([
    'PICKUP_CORAL',
    'PICKUP_ALGAE',
    'FEED',
    'AUTO_LEAVE',
    'DEFEND',
    'SCORE_NET',
    'FAIL_NET',
    'SCORE_PROCESSOR',
    'SCORE_CORAL',
    'DROP_ALGAE',
    'DROP_CORAL',
    'START_POSITION',
  ])
  .openapi('EventAction');

export const MatchType = z.enum(['QUALIFICATION', 'ELIMINATION']).openapi('MatchType');

export const RobotRole = z.enum(['OFFENSE', 'DEFENSE', 'FEEDER', 'IMMOBILE']).openapi('RobotRole');

export const AlgaePickup = z.enum(['NONE', 'GROUND', 'REEF', 'BOTH']).openapi('AlgaePickup');

export const KnocksAlgae = z.enum(['NO', 'YES']).openapi('KnocksAlgae');

export const AutoLeave = z.enum(['NO', 'YES']).openapi('AutoLeave');

export const UnderShallowCage = z.enum(['NO', 'YES']).openapi('UnderShallowCage');

export const CoralPickup = z.enum(['NONE', 'GROUND', 'STATION', 'BOTH']).openapi('CoralPickup');

export const BargeResult = z
  .enum(['NOT_ATTEMPTED', 'PARKED', 'SHALLOW', 'FAILED_SHALLOW', 'DEEP', 'FAILED_DEEP'])
  .openapi('BargeResult');

export const WarningType = z.enum(['AUTO_LEAVE', 'BREAK']).openapi('WarningType');

export const UserRole = z.enum(['MEMBER', 'ADMIN', 'OWNER']).openapi('UserRole');

export type Position = z.infer<typeof Position>;
export type EventAction = z.infer<typeof EventAction>;
export type MatchType = z.infer<typeof MatchType>;
export type RobotRole = z.infer<typeof RobotRole>;
export type AlgaePickup = z.infer<typeof AlgaePickup>;
export type KnocksAlgae = z.infer<typeof KnocksAlgae>;
export type AutoLeave = z.infer<typeof AutoLeave>;
export type UnderShallowCage = z.infer<typeof UnderShallowCage>;
export type CoralPickup = z.infer<typeof CoralPickup>;
export type BargeResult = z.infer<typeof BargeResult>;
export type WarningType = z.infer<typeof WarningType>;
export type UserRole = z.infer<typeof UserRole>;
