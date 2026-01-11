import { z } from '@hono/zod-openapi';
import { UserRole } from './enums';

export const apiKeySchema = z
  .object({
    uuid: z.string().openapi({ example: '550e8400-e29b-41d4-a716-446655440000' }),
    keyHash: z.string().openapi({ example: 'hashed_api_key_value' }),
    name: z.string().openapi({ example: 'My API Key' }),
    userId: z.string().openapi({ example: 'auth0|1234567890' }),
    createdAt: z.string().openapi({ example: '2023-10-01T12:00:00Z' }),
    lastUsed: z.string().nullable().openapi({ example: '2023-10-10T15:30:00Z' }),
    requests: z.number().openapi({ example: 150 }),
  })
  .openapi('ApiKey');

export const UserSchema = z
  .object({
    id: z.string().openapi({ example: 'auth0|1234567890' }),
    teamNumber: z.number().nullable().openapi({ example: 8033 }),
    email: z.string().email().openapi({ example: 'lovat@frc8033.com' }),
    emailVerified: z.boolean().openapi({ example: true }),
    username: z.string().nullable().openapi({ example: 'lovat_scout' }),
    role: UserRole.openapi({ example: 'MEMBER' }),
    tournamentSourceRule: z
      .object({
        mode: z.enum(['INCLUDE', 'EXCLUDE']).openapi({ example: 'EXCLUDE' }),
        items: z.array(z.string()).openapi({ example: ['tournament1', 'tournament2'] }),
      })
      .openapi('TournamentSourceRule'),
    teamSourceRule: z
      .object({
        mode: z.enum(['INCLUDE', 'EXCLUDE']).openapi({ example: 'EXCLUDE' }),
        items: z.array(z.number()).openapi({ example: [1234, 5678] }),
      })
      .openapi('TeamSourceRule'),
    apiKeys: z.array(apiKeySchema).optional(),
  })
  .openapi('User');
