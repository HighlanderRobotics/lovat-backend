import type { AuthIdentity } from '../../app/context';

export interface Authenticator {
  authenticate(token: string): Promise<AuthIdentity | null>;
}
