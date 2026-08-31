import { randomUUID } from 'node:crypto';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  autoClimb,
  beached,
  climbPosition,
  climbSide,
  endgameClimb,
  eventAction,
  feederType,
  fieldTraversal,
  intakeType,
  position,
  robotRole,
} from './enums';
import { registeredTeams } from './teams';
import { teamMatchData, tournaments } from './competition';

export const scouters = pgTable(
  'Scouter',
  {
    uuid: text('uuid')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text('name'),
    sourceTeamNumber: integer('sourceTeamNumber')
      .notNull()
      .references(() => registeredTeams.number, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    strikes: integer('strikes').notNull().default(0),
    scouterReliability: integer('scouterReliability').notNull().default(0),
    archived: boolean('archived').notNull().default(false),
  },
  (table) => [index('Scouter_sourceTeamNumber_idx').on(table.sourceTeamNumber)]
);

export const scouterScheduleShifts = pgTable('ScouterScheduleShift', {
  uuid: text('uuid')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  sourceTeamNumber: integer('sourceTeamNumber')
    .notNull()
    .references(() => registeredTeams.number, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  tournamentKey: text('tournamentKey')
    .notNull()
    .references(() => tournaments.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
  startMatchOrdinalNumber: integer('startMatchOrdinalNumber').notNull(),
  endMatchOrdinalNumber: integer('endMatchOrdinalNumber').notNull(),
});

export const scoutReports = pgTable('ScoutReport', {
  uuid: text('uuid')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  teamMatchKey: text('teamMatchKey')
    .notNull()
    .references(() => teamMatchData.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
  startTime: timestamp('startTime', { mode: 'date', precision: 3 }).notNull(),
  notes: text('notes').notNull(),
  robotRoles: robotRole('robotRoles').array().notNull(),
  driverAbility: integer('driverAbility').notNull(),
  scouterUuid: text('scouterUuid')
    .notNull()
    .references(() => scouters.uuid, { onDelete: 'cascade', onUpdate: 'cascade' }),
  robotBrokeDescription: text('robotBrokeDescription'),
  accuracy: integer('accuracy'),
  beached: beached('beached').notNull(),
  climbPosition: climbPosition('climbPosition'),
  climbSide: climbSide('climbSide'),
  defenseEffectiveness: integer('defenseEffectiveness').notNull(),
  feederTypes: feederType('feederTypes').array().notNull(),
  intakeType: intakeType('intakeType').notNull(),
  fieldTraversal: fieldTraversal('fieldTraversal').notNull(),
  scoresWhileMoving: boolean('scoresWhileMoving').notNull(),
  disrupts: boolean('disrupts').notNull(),
  endgameClimb: endgameClimb('endgameClimb').notNull(),
  autoClimb: autoClimb('autoClimb').notNull(),
});

export const events = pgTable(
  'Event',
  {
    eventUuid: text('eventUuid')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    time: doublePrecision('time').notNull(),
    action: eventAction('action').notNull(),
    position: position('position').notNull(),
    points: integer('points').notNull(),
    quantity: integer('quantity'),
    scoutReportUuid: text('scoutReportUuid')
      .notNull()
      .references(() => scoutReports.uuid, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
  },
  (table) => [index('Event_scoutReportUuid_idx').on(table.scoutReportUuid)]
);

function shiftAssignmentTable(name: `_Team${1 | 2 | 3 | 4 | 5 | 6}`) {
  return pgTable(
    name,
    {
      A: text('A')
        .notNull()
        .references(() => scouters.uuid, { onDelete: 'cascade', onUpdate: 'cascade' }),
      B: text('B')
        .notNull()
        .references(() => scouterScheduleShifts.uuid, {
          onDelete: 'cascade',
          onUpdate: 'cascade',
        }),
    },
    (table) => [
      uniqueIndex(`${name}_AB_unique`).on(table.A, table.B),
      index(`${name}_B_index`).on(table.B),
    ]
  );
}

export const scouterScheduleShiftTeam1 = shiftAssignmentTable('_Team1');
export const scouterScheduleShiftTeam2 = shiftAssignmentTable('_Team2');
export const scouterScheduleShiftTeam3 = shiftAssignmentTable('_Team3');
export const scouterScheduleShiftTeam4 = shiftAssignmentTable('_Team4');
export const scouterScheduleShiftTeam5 = shiftAssignmentTable('_Team5');
export const scouterScheduleShiftTeam6 = shiftAssignmentTable('_Team6');
