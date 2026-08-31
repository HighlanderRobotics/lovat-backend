import {
  allianceColor,
  autoClimb,
  beached,
  climbPosition,
  climbSide,
  endgameClimb,
  eventAction,
  feederType,
  fieldTraversal,
  intakeType,
  matchType,
  position,
  robotRole,
  userRole,
  warningType,
} from '../schema';
import { z } from '@hono/zod-openapi';
import { createDatabaseSelectSchema } from './factory';

export const AllianceColorSchema =
  createDatabaseSelectSchema(allianceColor).openapi('AllianceColor');
export const PositionSchema = createDatabaseSelectSchema(position).openapi('Position');
export const EventActionSchema = createDatabaseSelectSchema(eventAction).openapi('EventAction');
export const FieldTraversalSchema =
  createDatabaseSelectSchema(fieldTraversal).openapi('FieldTraversal');
export const BeachedSchema = createDatabaseSelectSchema(beached).openapi('Beached');
export const EndgameClimbSchema = createDatabaseSelectSchema(endgameClimb).openapi('EndgameClimb');
export const ClimbPositionSchema =
  createDatabaseSelectSchema(climbPosition).openapi('ClimbPosition');
export const ClimbSideSchema = createDatabaseSelectSchema(climbSide).openapi('ClimbSide');
export const AutoClimbSchema = createDatabaseSelectSchema(autoClimb).openapi('AutoClimb');
export const FeederTypeSchema = createDatabaseSelectSchema(feederType).openapi('FeederType');
export const IntakeTypeSchema = createDatabaseSelectSchema(intakeType).openapi('IntakeType');
export const RobotRoleSchema = createDatabaseSelectSchema(robotRole).openapi('RobotRole');
export const WarningTypeSchema = createDatabaseSelectSchema(warningType).openapi('WarningType');
export const UserRoleSchema = createDatabaseSelectSchema(userRole).openapi('UserRole');
export const MatchTypeSchema = createDatabaseSelectSchema(matchType).openapi('MatchType');

export type AllianceColor = z.infer<typeof AllianceColorSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type EventAction = z.infer<typeof EventActionSchema>;
export type FieldTraversal = z.infer<typeof FieldTraversalSchema>;
export type Beached = z.infer<typeof BeachedSchema>;
export type EndgameClimb = z.infer<typeof EndgameClimbSchema>;
export type ClimbPosition = z.infer<typeof ClimbPositionSchema>;
export type ClimbSide = z.infer<typeof ClimbSideSchema>;
export type AutoClimb = z.infer<typeof AutoClimbSchema>;
export type FeederType = z.infer<typeof FeederTypeSchema>;
export type IntakeType = z.infer<typeof IntakeTypeSchema>;
export type RobotRole = z.infer<typeof RobotRoleSchema>;
export type WarningType = z.infer<typeof WarningTypeSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type MatchType = z.infer<typeof MatchTypeSchema>;
