import { pgTable, varchar, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { matchType } from "./enums";

export const tournaments = pgTable("Tournament", {
  key: varchar("key").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location"),
  date: varchar("date"),
});

export const teamMatchData = pgTable("TeamMatchData", {
  key: varchar("key").primaryKey(),
  tournamentKey: varchar("tournamentKey").notNull(),
  matchNumber: integer("matchNumber").notNull(),
  teamNumber: integer("teamNumber").notNull(),
  matchType: matchType("matchType").notNull(),
});

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  teamMatchData: many(teamMatchData),
}));

export const teamMatchDataRelations = relations(teamMatchData, ({ one }) => ({
  tournament: one(tournaments, {
    fields: [teamMatchData.tournamentKey],
    references: [tournaments.key],
  }),
}));
