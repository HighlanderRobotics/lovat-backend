import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const teams = pgTable('Team', {
  number: integer('number').primaryKey(),
  name: text('name').notNull(),
});

export const registeredTeams = pgTable('RegisteredTeam', {
  number: integer('number')
    .primaryKey()
    .references(() => teams.number, { onDelete: 'cascade', onUpdate: 'cascade' }),
  code: text('code').notNull().unique(),
  email: text('email').notNull(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  timeCreated: timestamp('timeCreated', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  teamApproved: boolean('teamApproved').notNull().default(false),
  website: text('website'),
});
