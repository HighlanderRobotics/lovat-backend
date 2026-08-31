import { NotFound } from '../../platform/http/errors';
import type { Account, AccountsRepository } from './accounts.repository';

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

    async updateSettings(
      id: string,
      settings: Partial<Pick<Account, 'username' | 'teamSourceRule' | 'tournamentSourceRule'>>
    ) {
      const current = await repository.findById(id);
      if (!current) throw new NotFound('Account not found');
      const account = await repository.updateSettings(id, {
        username: settings.username === undefined ? current.username : settings.username,
        teamSourceRule:
          settings.teamSourceRule === undefined ? current.teamSourceRule : settings.teamSourceRule,
        tournamentSourceRule:
          settings.tournamentSourceRule === undefined
            ? current.tournamentSourceRule
            : settings.tournamentSourceRule,
      });
      if (!account) throw new NotFound('Account not found');
      return account;
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
