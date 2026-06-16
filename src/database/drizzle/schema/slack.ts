import { pgTable, varchar, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { warningType } from './enums';

export const slackWorkspaces = pgTable('SlackWorkspace', {
  workspaceId: varchar('workspaceId').primaryKey(),
  owner: integer('owner').notNull(),
  name: varchar('name').notNull(),
  authToken: varchar('authToken').notNull(),
  botUserId: varchar('botUserId').notNull(),
  authUserId: varchar('authUserId').notNull(),
});

export const slackSubscriptions = pgTable('SlackSubscription', {
  subscriptionId: varchar('subscriptionId').primaryKey(),
  channelId: varchar('channelId').notNull(),
  workspaceId: varchar('workspaceId').notNull(),
  subscribedEvent: warningType('subscribedEvent').notNull(),
});

export const slackNotificationThreads = pgTable('SlackNotificationThread', {
  messageId: varchar('messageId').primaryKey(),
  matchNumber: integer('matchNumber').notNull(),
  teamNumber: integer('teamNumber').notNull(),
  subscriptionId: varchar('subscriptionId').notNull(),
  channelId: varchar('channelId').notNull(),
});

export const slackWorkspacesRelations = relations(slackWorkspaces, ({ many }) => ({
  subscriptions: many(slackSubscriptions),
}));

export const slackSubscriptionsRelations = relations(slackSubscriptions, ({ one, many }) => ({
  workspace: one(slackWorkspaces, {
    fields: [slackSubscriptions.workspaceId],
    references: [slackWorkspaces.workspaceId],
  }),
  notificationRecords: many(slackNotificationThreads),
}));

export const slackNotificationThreadsRelations = relations(slackNotificationThreads, ({ one }) => ({
  channel: one(slackSubscriptions, {
    fields: [slackNotificationThreads.subscriptionId],
    references: [slackSubscriptions.subscriptionId],
  }),
}));
