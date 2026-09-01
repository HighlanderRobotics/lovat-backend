import { z } from '@hono/zod-openapi';
import {
  TeamSourceRuleSchema,
  TournamentSourceRuleSchema,
  UserSchema,
  UserUpdateSchema,
} from '../../platform/database/schemas';

export const AccountResponseSchema = UserSchema.pick({
  id: true,
  teamNumber: true,
  email: true,
  emailVerified: true,
  username: true,
  role: true,
}).openapi('Account');

export const AccountSettingsSchema = UserSchema.pick({
  username: true,
  teamSourceRule: true,
  tournamentSourceRule: true,
}).openapi('AccountSettings');

export const AccountSettingsUpdateSchema = UserUpdateSchema.pick({
  username: true,
  teamSourceRule: true,
  tournamentSourceRule: true,
})
  .extend({
    username: z.string().trim().min(1).max(100).nullable().optional(),
    teamSourceRule: TeamSourceRuleSchema.optional(),
    tournamentSourceRule: TournamentSourceRuleSchema.optional(),
  })
  .refine(
    (value) =>
      value.username !== undefined ||
      value.teamSourceRule !== undefined ||
      value.tournamentSourceRule !== undefined,
    { message: 'At least one setting is required' }
  )
  .openapi('AccountSettingsUpdate');

export const TeamMemberSchema = UserSchema.pick({
  id: true,
  teamNumber: true,
  username: true,
  email: true,
  role: true,
}).openapi('TeamMember');
export const TeamMemberListSchema = z
  .object({ members: z.array(TeamMemberSchema) })
  .openapi('TeamMemberList');
export const PromoteScoutingLeadSchema = z
  .object({ userId: z.string().min(1) })
  .openapi('PromoteScoutingLead');
export const TeamProfileSchema = z
  .object({
    number: z.number().int().positive(),
    email: z.email(),
    website: z.string().nullable(),
  })
  .openapi('TeamProfile');
export const TeamWebsiteUpdateSchema = z
  .object({ website: z.string().trim().min(1).max(500).nullable() })
  .openapi('TeamWebsiteUpdate');
export const TeamRegistrationSchema = z
  .object({ number: z.number().int().positive(), email: z.email() })
  .openapi('TeamRegistration');
export const TeamRegistrationCreatedSchema = z
  .object({
    number: z.number().int().positive(),
    verificationRequired: z.boolean(),
    approvalRequired: z.boolean(),
  })
  .openapi('TeamRegistrationCreated');
export const JoinTeamSchema = z
  .object({ number: z.number().int().positive(), code: z.string().length(6) })
  .openapi('JoinTeam');
export const RegistrationStatusPathSchema = z.object({
  number: z.coerce.number().int().positive(),
});
export const RegistrationStatusSchema = z
  .discriminatedUnion('status', [
    z.object({ status: z.literal('NOT_STARTED') }),
    z.object({ status: z.literal('PENDING_EMAIL_VERIFICATION'), email: z.email() }),
    z.object({ status: z.literal('PENDING_WEBSITE') }),
    z.object({ status: z.literal('PENDING_TEAM_VERIFICATION'), teamEmail: z.email() }),
    z.object({ status: z.literal('REGISTERED_ON_TEAM') }),
    z.object({ status: z.literal('REGISTERED_OFF_TEAM') }),
    z.object({ status: z.literal('PENDING') }),
  ])
  .openapi('RegistrationStatus');
