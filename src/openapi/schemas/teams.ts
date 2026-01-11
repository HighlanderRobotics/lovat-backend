import { z } from '@hono/zod-openapi';

export const TeamSchema = z
  .object({
    number: z.number().int().openapi({ example: 8033 }),
    name: z.string().openapi({ example: 'The Lovatics' }),
  })
  .openapi('Team');

export const RegisteredTeamSchema = z
  .object({
    number: z.number().int().openapi({ example: 8033 }),
    code: z.string().openapi({ example: 'ABC123' }),
    email: z.string().email().openapi({ example: 'team@frc8033.com' }),
    emailVerified: z.boolean().openapi({ example: true }),
    teamApproved: z.boolean().openapi({ example: false }),
    website: z.string().nullable().openapi({ example: 'https://frc8033.com' }),
  })
  .openapi('RegisteredTeam');

export type Team = z.infer<typeof TeamSchema>;
export type RegisteredTeam = z.infer<typeof RegisteredTeamSchema>;
