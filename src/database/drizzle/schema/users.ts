import { pgTable, integer, varchar, pgEnum, json } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'OWNER']);

export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  teamNumber: integer('team_number'),
  email: varchar('email').notNull().unique(),
  emailVerified: varchar('email_verified'),
  username: varchar('username'),
  role: userRoleEnum('role').notNull().default('USER'),
  teamSourceRule: json('team_source_rule').default('{"mode": "EXCLUDE", "items": []}'),
  tournamentSourceRule: json('tournament_source_rule').default('{"mode": "EXCLUDE", "items": []}'),
});