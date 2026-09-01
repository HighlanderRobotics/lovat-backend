import { randomBytes } from 'node:crypto';
import { BadRequest, Forbidden, NotFound } from '../../platform/http/errors';
import type { Account, AccountsRepository } from './accounts.repository';

export function createAccountsService(repository: AccountsRepository) {
  async function uniqueTeamCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = randomBytes(6)
        .toString('base64url')
        .replace(/[^A-Z0-9]/gi, '')
        .toUpperCase()
        .slice(0, 6);
      if (code.length === 6 && !(await repository.findRegisteredTeamByCode(code))) return code;
    }
    throw new Error('Unable to generate a unique team code');
  }
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
    async registerTeam(id: string, input: { number: number; email: string }) {
      const account = await repository.findById(id);
      if (!account) throw new NotFound('Account not found');
      if (await repository.findRegisteredTeam(input.number))
        throw new BadRequest('Team is already registered');
      const fullRegistration = await repository.isFeatureEnabled('fullRegistration');
      try {
        const team = await repository.createRegistration({
          userId: id,
          ...input,
          code: await uniqueTeamCode(),
          teamApproved: !fullRegistration,
        });
        return {
          number: team.number,
          verificationRequired: true,
          approvalRequired: fullRegistration,
        };
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        )
          throw new BadRequest('Team is already registered');
        throw error;
      }
    },
    async joinTeam(id: string, input: { number: number; code: string }) {
      const account = await repository.findById(id);
      if (!account) throw new NotFound('Account not found');
      const team = await repository.findRegisteredTeam(input.number);
      if (!team) throw new NotFound('Registered team not found');
      if (team.code !== input.code) throw new NotFound('Team code is incorrect');
      const updated = await repository.joinTeam(id, team.number);
      if (!updated) throw new NotFound('Account not found');
      return updated;
    },
    async getRegistrationStatus(id: string, teamNumber: number) {
      const [account, team] = await Promise.all([
        repository.findById(id),
        repository.findRegisteredTeam(teamNumber),
      ]);
      if (!account) throw new NotFound('Account not found');
      if (!team) return { status: 'NOT_STARTED' as const };
      const [fullRegistration, userIds] = await Promise.all([
        repository.isFeatureEnabled('fullRegistration'),
        repository.listTeamUserIds(teamNumber),
      ]);
      const creator = userIds[0] === id;
      const onTeam = account.teamNumber === teamNumber;
      if (!creator) {
        if (team.emailVerified && team.teamApproved)
          return {
            status: onTeam ? ('REGISTERED_ON_TEAM' as const) : ('REGISTERED_OFF_TEAM' as const),
          };
        return { status: 'PENDING' as const };
      }
      if (!team.emailVerified)
        return { status: 'PENDING_EMAIL_VERIFICATION' as const, email: team.email };
      if (fullRegistration && !team.website) return { status: 'PENDING_WEBSITE' as const };
      if (!team.teamApproved)
        return { status: 'PENDING_TEAM_VERIFICATION' as const, teamEmail: team.email };
      return {
        status: onTeam ? ('REGISTERED_ON_TEAM' as const) : ('REGISTERED_OFF_TEAM' as const),
      };
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
