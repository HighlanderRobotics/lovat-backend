import { UserSchema } from '../../platform/database/schemas';

export const AccountResponseSchema = UserSchema.pick({
  id: true,
  teamNumber: true,
  email: true,
  emailVerified: true,
  username: true,
  role: true,
}).openapi('Account');
