import { pgTable, integer, varchar, boolean } from 'drizzle-orm/pg-core';
import { foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const teams = pgTable('Team', {
  number: integer('number').primaryKey(),
  name: varchar('name').notNull(),
});

export const registeredTeams = pgTable(
  'RegisteredTeam',
  {
    number: integer('number').primaryKey(),
    code: varchar('code').notNull().unique(),
    email: varchar('email').notNull(),
    emailVerified: boolean('emailVerified').notNull().default(false),
    teamApproved: boolean('teamApproved').notNull().default(false),
    website: varchar('website'),
  },
  (t) => ({
    teamFk: foreignKey({
      columns: [t.number],
      foreignColumns: [teams.number],
    }),
  })
);

export const teamsRelations = relations(teams, ({ one }) => ({
  registeredTeam: one(registeredTeams, {
    fields: [teams.number],
    references: [registeredTeams.number],
  }),
}));

export const registeredTeamsRelations = relations(registeredTeams, ({ one }) => ({
  team: one(teams, {
    fields: [registeredTeams.number],
    references: [teams.number],
  }),
}));
