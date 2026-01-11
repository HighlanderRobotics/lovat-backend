import { pgEnum } from 'drizzle-orm/pg-core';

export const position = pgEnum('Position', [
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
]);

export const eventAction = pgEnum('EventAction', [
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
]);

export const matchType = pgEnum('MatchType', ['QUALIFICATION', 'ELIMINATION']);

export const robotRole = pgEnum('RobotRole', ['OFFENSE', 'DEFENSE', 'FEEDER', 'IMMOBILE']);

export const algaePickup = pgEnum('AlgaePickup', ['NONE', 'GROUND', 'REEF', 'BOTH']);

export const knocksAlgae = pgEnum('KnocksAlgae', ['NO', 'YES']);

export const autoLeave = pgEnum('AutoLeave', ['NO', 'YES']);

export const underShallowCage = pgEnum('UnderShallowCage', ['NO', 'YES']);

export const coralPickup = pgEnum('CoralPickup', ['NONE', 'GROUND', 'STATION', 'BOTH']);

export const bargeResult = pgEnum('BargeResult', [
  'NOT_ATTEMPTED',
  'PARKED',
  'SHALLOW',
  'FAILED_SHALLOW',
  'DEEP',
  'FAILED_DEEP',
]);

export const warningType = pgEnum('WarningType', ['AUTO_LEAVE', 'BREAK']);

export const userRole = pgEnum('UserRole', ['MEMBER', 'ADMIN', "OWNER'"]);
