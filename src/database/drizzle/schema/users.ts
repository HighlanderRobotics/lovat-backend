import {
  pgTable,
  integer,
  varchar,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { userRole } from "./enums";

export const users = pgTable("User", {
  id: varchar("id").primaryKey(),
  teamNumber: integer("teamNumber"),
  email: varchar("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  username: varchar("username"),
  role: userRole("role").notNull().default("ANALYST"),
  // Deprecated fields kept for compatibility
  tournamentSource: varchar("tournamentSource").array(),
  teamSource: integer("teamSource").array(),
  tournamentSourceRule: jsonb("tournamentSourceRule")
    .notNull()
    .default(JSON.stringify({ mode: "EXCLUDE", items: [] })),
  teamSourceRule: jsonb("teamSourceRule")
    .notNull()
    .default(JSON.stringify({ mode: "EXCLUDE", items: [] })),
});

export const usersRelations = relations(users, ({ many }) => ({
  apiKeys: many(apiKeys),
}));

export const apiKeys = pgTable(
  "ApiKey",
  {
    uuid: varchar("uuid").primaryKey(),
    keyHash: varchar("keyHash").notNull().unique(),
    name: varchar("name").notNull(),
    userId: varchar("userId").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    lastUsed: timestamp("lastUsed", { mode: "date" }),
    requests: integer("requests").notNull().default(0),
  },
  (t) => ({
    userFk: {
      columns: [t.userId],
      references: () => [users.id],
    },
  }),
);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));
