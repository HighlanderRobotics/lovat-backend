import { z } from '@hono/zod-openapi';

export const Position = z
  .enum([
    'LEFT_TRENCH',
    'LEFT_BUMP',
    'HUB',
    'RIGHT_TRENCH',
    'RIGHT_BUMP',
    'NEUTRAL_ZONE',
    'DEPOT',
    'OUTPOST',
    'NONE',
  ])
  .openapi('Position');

export const EventAction = z
  .enum([
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
  ])
  .openapi('EventAction');

export const MatchType = z.enum(['QUALIFICATION', 'ELIMINATION']).openapi('MatchType');

export const RobotRole = z
  .enum(['CYCLING', 'SCORING', 'FEEDING', 'DEFENDING', 'IMMOBILE'])
  .openapi('RobotRole');

export const AutoClimb = z
  .enum(['NOT_ATTEMPTED', 'FAILED', 'SUCCEEDED'])
  .openapi('AutoClimb');

export const Beached = z.enum(['ON_FUEL', 'ON_BUMP', 'BOTH', 'NEITHER']).openapi('Beached');

export const ClimbPosition = z.enum(['SIDE', 'MIDDLE']).openapi('ClimbPosition');

export const ClimbSide = z.enum(['FRONT', 'BACK']).openapi('ClimbSide');

export const EndgameClimb = z
  .enum(['NOT_ATTEMPTED', 'FAILED', 'L1', 'L2', 'L3'])
  .openapi('EndgameClimb');

export const FeederType = z
  .enum(['CONTINUOUS', 'STOP_TO_SHOOT', 'DUMP'])
  .openapi('FeederType');

export const FieldTraversal = z.enum(['TRENCH', 'BUMP', 'BOTH', 'NONE']).openapi('FieldTraversal');

export const IntakeType = z.enum(['GROUND', 'OUTPOST', 'BOTH', 'NEITHER']).openapi('IntakeType');

export const WarningType = z.enum(['AUTO_LEAVE', 'BREAK']).openapi('WarningType');

export const UserRole = z.enum(['MEMBER', 'ADMIN', 'OWNER']).openapi('UserRole');
