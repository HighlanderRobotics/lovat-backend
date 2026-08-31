import { randomUUID } from 'node:crypto';
import { doublePrecision, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { users } from './accounts';
import { tournaments } from './competition';

export const mutablePicklists = pgTable('MutablePicklist', {
  uuid: text('uuid')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  teams: integer('teams').array().notNull(),
  authorId: text('authorId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  name: text('name').notNull(),
  tournamentKey: text('tournamentKey').references(() => tournaments.key, {
    onDelete: 'set null',
    onUpdate: 'cascade',
  }),
});

export const sharedPicklists = pgTable('SharedPicklist', {
  uuid: text('uuid')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text('name').notNull(),
  totalPoints: doublePrecision('totalPoints').notNull(),
  autoPoints: doublePrecision('autoPoints').notNull(),
  teleopPoints: doublePrecision('teleopPoints').notNull(),
  authorId: text('authorId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  autoClimb: doublePrecision('autoClimb').notNull(),
  campingDefenseTime: doublePrecision('campingDefenseTime').notNull(),
  climbResult: doublePrecision('climbResult').notNull(),
  contactDefenseTime: doublePrecision('contactDefenseTime').notNull(),
  driverAbility: doublePrecision('driverAbility').notNull(),
  defenseEffectiveness: doublePrecision('defenseEffectiveness').notNull(),
  estimatedSuccessfulFuelRate: doublePrecision('estimatedSuccessfulFuelRate').notNull(),
  estimatedTotalFuelScored: doublePrecision('estimatedTotalFuelScored').notNull(),
  feedingRate: doublePrecision('feedingRate').notNull(),
  scoringRate: doublePrecision('scoringRate').notNull(),
  totalDefensiveTime: doublePrecision('totalDefensiveTime').notNull(),
  totalFuelFed: doublePrecision('totalFuelFed').notNull(),
  totalFuelThroughput: doublePrecision('totalFuelThroughput').notNull(),
});
