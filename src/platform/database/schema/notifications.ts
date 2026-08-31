import { integer, pgTable, text } from 'drizzle-orm/pg-core';
import { warningType } from './enums';
import { registeredTeams } from './teams';

export const slackWorkspaces = pgTable('SlackWorkspace', {
  workspaceId: text('workspaceId').primaryKey(),
  owner: integer('owner')
    .notNull()
    .references(() => registeredTeams.number, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  name: text('name').notNull(),
  authToken: text('authToken').notNull(),
  botUserId: text('botUserId').notNull(),
  authUserId: text('authUserId').notNull(),
});

export const slackSubscriptions = pgTable('SlackSubscription', {
  subscriptionId: text('subscriptionId').primaryKey(),
  channelId: text('channelId').notNull(),
  workspaceId: text('workspaceId')
    .notNull()
    .references(() => slackWorkspaces.workspaceId, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  subscribedEvent: warningType('subscribedEvent').notNull(),
});

export const slackNotificationThreads = pgTable('SlackNotificationThread', {
  messageId: text('messageId').primaryKey(),
  matchNumber: integer('matchNumber').notNull(),
  teamNumber: integer('teamNumber').notNull(),
  subscriptionId: text('subscriptionId')
    .notNull()
    .references(() => slackSubscriptions.subscriptionId, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
  channelId: text('channelId').notNull(),
});
