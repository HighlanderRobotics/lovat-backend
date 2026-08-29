import type { AccountRole } from '../modules/accounts/accounts.repository';

export type AuthIdentity = {
  userId: string;
  role: AccountRole;
  tokenType: 'jwt';
};

export type AppEnvironment = {
  Variables: {
    auth: AuthIdentity;
    requestId: string;
  };
};
