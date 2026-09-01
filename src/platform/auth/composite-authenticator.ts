import type { Authenticator } from './types';

export function createCompositeAuthenticator(
  dashboard: Authenticator,
  apiKeys: Authenticator
): Authenticator {
  return {
    authenticate(token) {
      return token.startsWith('lvt-') ? apiKeys.authenticate(token) : dashboard.authenticate(token);
    },
  };
}
