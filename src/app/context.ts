import type { AccountRole } from '../modules/accounts/accounts.repository';

export type AuthIdentity = {
  userId: string;
  role: AccountRole;
  tokenType: 'jwt' | 'apiKey';
};

export type AppEnvironment = {
  Variables: {
    auth: AuthIdentity;
    requestId: string;
  };
};
