import { boolean, integer, jsonb, pgEnum, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const accountRole = pgEnum('UserRole', ['MEMBER', 'ADMIN', 'OWNER']);

export type SourceRule<T> = {
  mode: 'INCLUDE' | 'EXCLUDE';
  items: T[];
};

const defaultSourceRule = { mode: 'EXCLUDE', items: [] } satisfies SourceRule<never>;

export const users = pgTable('User', {
  id: varchar('id').primaryKey(),
  teamNumber: integer('teamNumber'),
  email: varchar('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  username: varchar('username'),
  role: accountRole('role').notNull().default('MEMBER'),
  tournamentSourceRule: jsonb('tournamentSourceRule')
    .$type<SourceRule<string>>()
    .notNull()
    .default(defaultSourceRule),
  teamSourceRule: jsonb('teamSourceRule')
    .$type<SourceRule<number>>()
    .notNull()
    .default(defaultSourceRule),
});

export const apiKeys = pgTable('ApiKey', {
  uuid: varchar('uuid').primaryKey(),
  keyHash: varchar('keyHash').notNull().unique(),
  name: varchar('name').notNull(),
  userId: varchar('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  lastUsed: timestamp('lastUsed', { mode: 'date' }),
  requests: integer('requests').notNull().default(0),
});
