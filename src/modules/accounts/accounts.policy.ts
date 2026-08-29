import type { AuthIdentity } from '../../app/context';
import { Forbidden } from '../../platform/http/errors';

export function assertCanDeleteAccount(identity: AuthIdentity, accountId: string): void {
  if (identity.userId !== accountId) {
    throw new Forbidden('You cannot delete another account');
  }
}
