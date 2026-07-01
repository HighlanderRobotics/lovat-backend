import { pgEnum } from 'drizzle-orm/pg-core';

export const position = pgEnum('Position', [
  'LEFT_TRENCH',
  'LEFT_BUMP',
  'HUB',
  'RIGHT_TRENCH',
  'RIGHT_BUMP',
  'NEUTRAL_ZONE',
  'DEPOT',
  'OUTPOST',
  'NONE',
]);

export const eventAction = pgEnum('EventAction', [
  'START_SCORING',
  'STOP_SCORING',
  'START_MATCH',
  'START_CAMPING',
  'STOP_CAMPING',
  'START_DEFENDING',
  'STOP_DEFENDING',
  'INTAKE',
  'OUTTAKE',
  'DISRUPT',
  'CROSS',
  'CLIMB',
  'START_FEEDING',
  'STOP_FEEDING',
]);

export const matchType = pgEnum('MatchType', ['QUALIFICATION', 'ELIMINATION']);

export const robotRole = pgEnum('RobotRole', [
  'CYCLING',
  'SCORING',
  'FEEDING',
  'DEFENDING',
  'IMMOBILE',
]);

export const autoClimb = pgEnum('AutoClimb', [
  'NOT_ATTEMPTED',
  'FAILED',
  'SUCCEEDED',
]);

export const beached = pgEnum('Beached', [
  'ON_FUEL',
  'ON_BUMP',
  'BOTH',
  'NEITHER',
]);

export const climbPosition = pgEnum('ClimbPosition', ['SIDE', 'MIDDLE']);

export const climbSide = pgEnum('ClimbSide', ['FRONT', 'BACK']);

export const endgameClimb = pgEnum('EndgameClimb', [
  'NOT_ATTEMPTED',
  'FAILED',
  'L1',
  'L2',
  'L3',
]);

export const feederType = pgEnum('FeederType', [
  'CONTINUOUS',
  'STOP_TO_SHOOT',
  'DUMP',
]);

export const fieldTraversal = pgEnum('FieldTraversal', [
  'TRENCH',
  'BUMP',
  'BOTH',
  'NONE',
]);

export const intakeType = pgEnum('IntakeType', [
  'GROUND',
  'OUTPOST',
  'BOTH',
  'NEITHER',
]);

export const warningType = pgEnum('WarningType', ['AUTO_LEAVE', 'BREAK']);

export const userRole = pgEnum('UserRole', ['MEMBER', 'ADMIN', 'OWNER']);
