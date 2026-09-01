import { Forbidden, NotFound } from '../../platform/http/errors';
import type { Account, AccountsRepository } from './accounts.repository';

export function createAccountsService(repository: AccountsRepository) {
  async function teamAccount(id: string, lead = false) {
    const account = await repository.findById(id);
    if (!account) throw new NotFound('Account not found');
    if (account.teamNumber === null || !(await repository.isTeamVerified(account.teamNumber)))
      throw new Forbidden('A verified team is required');
    if (lead && account.role !== 'SCOUTING_LEAD')
      throw new Forbidden('Only scouting leads can perform this action');
    return account;
  }
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
    async listTeamMembers(id: string) {
      const account = await teamAccount(id);
      return repository.listTeamMembers(account.teamNumber!);
    },
    async listAnalysts(id: string) {
      const account = await teamAccount(id, true);
      return repository.listTeamMembers(account.teamNumber!, 'ANALYST');
    },
    async promoteToScoutingLead(id: string, upgradedUserId: string) {
      const account = await teamAccount(id, true);
      const target = await repository.findById(upgradedUserId);
      if (!target) throw new NotFound('Account to promote not found');
      if (target.teamNumber !== account.teamNumber)
        throw new Forbidden('Account to promote belongs to another team');
      if (target.id === account.id || target.role === 'SCOUTING_LEAD') return target;
      const updated = await repository.updateRole(target.id, 'SCOUTING_LEAD');
      if (!updated) throw new NotFound('Account to promote not found');
      return updated;
    },
    async getTeamProfile(id: string) {
      const account = await teamAccount(id, true);
      const team = await repository.findRegisteredTeam(account.teamNumber!);
      if (!team) throw new NotFound('Registered team not found');
      return { number: team.number, email: team.email, website: team.website };
    },
    async updateTeamWebsite(id: string, website: string | null) {
      const account = await repository.findById(id);
      if (!account) throw new NotFound('Account not found');
      if (account.teamNumber === null) throw new Forbidden('A team is required');
      const team = await repository.updateTeamWebsite(account.teamNumber, website);
      if (!team) throw new NotFound('Registered team not found');
      return { number: team.number, email: team.email, website: team.website };
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
