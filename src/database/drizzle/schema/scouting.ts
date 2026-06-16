import { pgTable, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  robotRole,
  algaePickup,
  coralPickup,
  bargeResult,
  knocksAlgae,
  underShallowCage,
  eventAction,
  position,
} from './enums';
import { teamMatchData, tournaments } from './tournaments';
import { registeredTeams } from './teams';

export const scoutReports = pgTable('ScoutReport', {
  uuid: varchar('uuid').primaryKey(),
  teamMatchKey: varchar('teamMatchKey').notNull(),
  startTime: timestamp('startTime', { mode: 'date' }).notNull(),
  notes: varchar('notes').notNull(),
  robotRole: robotRole('robotRole').notNull(),
  algaePickup: algaePickup('algaePickup').notNull(),
  coralPickup: coralPickup('coralPickup').notNull(),
  bargeResult: bargeResult('bargeResult').notNull(),
  knocksAlgae: knocksAlgae('knocksAlgae').notNull(),
  underShallowCage: underShallowCage('underShallowCage').notNull(),
  robotBrokeDescription: varchar('robotBrokeDescription'),
  driverAbility: integer('driverAbility').notNull(),
  scouterUuid: varchar('scouterUuid').notNull(),
});

export const events = pgTable('Event', {
  eventUuid: varchar('eventUuid').primaryKey(),
  time: integer('time').notNull(),
  action: eventAction('action').notNull(),
  position: position('position').notNull(),
  points: integer('points').notNull(),
  scoutReportUuid: varchar('scoutReportUuid').notNull(),
});

export const scouters = pgTable('Scouter', {
  uuid: varchar('uuid').primaryKey(),
  name: varchar('name'),
  archived: boolean('archived').notNull().default(false),
  sourceTeamNumber: integer('sourceTeamNumber').notNull(),
  strikes: integer('strikes').notNull().default(0),
  scouterReliability: integer('scouterReliability').notNull().default(0),
});

export const scouterScheduleShifts = pgTable('ScouterScheduleShift', {
  uuid: varchar('uuid').primaryKey(),
  sourceTeamNumber: integer('sourceTeamNumber').notNull(),
  tournamentKey: varchar('tournamentKey').notNull(),
  startMatchOrdinalNumber: integer('startMatchOrdinalNumber').notNull(),
  endMatchOrdinalNumber: integer('endMatchOrdinalNumber').notNull(),
});

export const scouterScheduleShiftsRelations = relations(scouterScheduleShifts, ({ one }) => ({
  sourceTeam: one(registeredTeams, {
    fields: [scouterScheduleShifts.sourceTeamNumber],
    references: [registeredTeams.number],
  }),
  tournament: one(tournaments, {
    fields: [scouterScheduleShifts.tournamentKey],
    references: [tournaments.key],
  }),
}));

export const scoutReportsRelations = relations(scoutReports, ({ many, one }) => ({
  events: many(events),
  scouter: one(scouters, {
    fields: [scoutReports.scouterUuid],
    references: [scouters.uuid],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  scoutReport: one(scoutReports, {
    fields: [events.scoutReportUuid],
    references: [scoutReports.uuid],
  }),
}));

export const scoutReportsTeamMatchRelations = relations(scoutReports, ({ one }) => ({
  teamMatch: one(teamMatchData, {
    fields: [scoutReports.teamMatchKey],
    references: [teamMatchData.key],
  }),
}));
