import { z } from '@hono/zod-openapi';
import { WarningType } from './enums';

export const SlackWorkspaceSchema = z
  .object({
    workspaceId: z.string().openapi({ example: 'T12345678' }),
    owner: z.number().int().openapi({ example: 8033 }),
    name: z.string().openapi({ example: 'Lovat Workspace' }),
    authToken: z.string().openapi({ example: 'xoxb-...' }),
    botUserId: z.string().openapi({ example: 'U12345678' }),
    authUserId: z.string().openapi({ example: 'U87654321' }),
  })
  .openapi('SlackWorkspace');

export const SlackSubscriptionSchema = z
  .object({
    subscriptionId: z.string().openapi({ example: 'S123' }),
    channelId: z.string().openapi({ example: 'C12345678' }),
    workspaceId: z.string().openapi({ example: 'T12345678' }),
    subscribedEvent: WarningType.openapi({ example: 'AUTO_LEAVE' }),
  })
  .openapi('SlackSubscription');

export const SlackNotificationThreadSchema = z
  .object({
    messageId: z.string().openapi({ example: '1690000000.000100' }),
    matchNumber: z.number().int().openapi({ example: 24 }),
    teamNumber: z.number().int().openapi({ example: 8033 }),
    subscriptionId: z.string().openapi({ example: 'S123' }),
    channelId: z.string().openapi({ example: 'C12345678' }),
  })
  .openapi('SlackNotificationThread');

export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type SlackSubscription = z.infer<typeof SlackSubscriptionSchema>;
export type SlackNotificationThread = z.infer<typeof SlackNotificationThreadSchema>;
