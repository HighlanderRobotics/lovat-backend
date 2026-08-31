import { NotFound } from '../../platform/http/errors';
import type { AccountsRepository } from './accounts.repository';

export function createAccountsService(repository: AccountsRepository) {
  return {
    async getRequired(id: string) {
      const account = await repository.findById(id);
      if (!account) {
        throw new NotFound('Account not found');
      }
      return account;
    },

    async delete(id: string) {
      const deleted = await repository.deleteById(id);
      if (!deleted) {
        throw new NotFound('Account not found');
      }
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
