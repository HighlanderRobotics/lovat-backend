import { randomUUID } from 'node:crypto';
import { boolean, integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { userRole } from './enums';
import { registeredTeams } from './teams';

export type SourceRule<T> = {
  mode: 'INCLUDE' | 'EXCLUDE';
  items: T[];
};

const defaultSourceRule = { mode: 'EXCLUDE', items: [] } satisfies SourceRule<never>;

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  teamNumber: integer('teamNumber').references(() => registeredTeams.number, {
    onDelete: 'cascade',
    onUpdate: 'cascade',
  }),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  username: text('username'),
  role: userRole('role').notNull().default('ANALYST'),
  teamSourceRule: jsonb('teamSourceRule')
    .$type<SourceRule<number>>()
    .notNull()
    .default(defaultSourceRule),
  tournamentSourceRule: jsonb('tournamentSourceRule')
    .$type<SourceRule<string>>()
    .notNull()
    .default(defaultSourceRule),
});

export const apiKeys = pgTable('ApiKey', {
  uuid: text('uuid')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  keyHash: text('keyHash').notNull().unique(),
  name: text('name').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  lastUsed: timestamp('lastUsed', { mode: 'date', precision: 3 }),
  requests: integer('requests').notNull().default(0),
});

export const emailVerificationRequests = pgTable('EmailVerificationRequest', {
  verificationCode: text('verificationCode').primaryKey(),
  email: text('email').notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date', precision: 3 }).notNull(),
  teamNumber: integer('teamNumber').notNull(),
});
