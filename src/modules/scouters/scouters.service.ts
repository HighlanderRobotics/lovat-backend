import { Forbidden, NotFound } from '../../platform/http/errors';
import type { RosterAccount, ScoutersRepository } from './scouters.repository';

function requireVerifiedTeam(account: RosterAccount) {
  if (account.teamNumber === null || account.emailVerified !== true) {
    throw new Forbidden('A verified team is required to manage the scouter roster');
  }
  return account.teamNumber;
}

function requireScoutingLead(account: RosterAccount) {
  if (account.role !== 'SCOUTING_LEAD') {
    throw new Forbidden('Only scouting leads can change the scouter roster');
  }
}

export function createScoutersService(repository: ScoutersRepository) {
  async function getAccount(userId: string) {
    const account = await repository.findAccount(userId);
    if (!account) throw new NotFound('Account not found');
    return account;
  }

  return {
    async checkTeamCode(code: string) {
      const teamNumber = await repository.findTeamNumberByCode(code);
      return teamNumber === null ? { valid: false as const } : { valid: true as const, teamNumber };
    },

    async listByTeamCode(code: string) {
      const teamNumber = await repository.findTeamNumberByCode(code);
      if (teamNumber === null) throw new NotFound('Team code not found');
      return repository.list(teamNumber, false);
    },

    async list(userId: string, archived?: boolean) {
      const account = await getAccount(userId);
      const teamNumber = requireVerifiedTeam(account);
      return repository.list(teamNumber, archived);
    },

    async create(userId: string, name: string) {
      const account = await getAccount(userId);
      const teamNumber = requireVerifiedTeam(account);
      requireScoutingLead(account);
      return repository.create(teamNumber, name);
    },

    async update(userId: string, uuid: string, changes: { name?: string; archived?: boolean }) {
      const account = await getAccount(userId);
      const teamNumber = requireVerifiedTeam(account);
      requireScoutingLead(account);

      const scouter = await repository.findById(uuid);
      if (!scouter) throw new NotFound('Scouter not found');
      if (scouter.sourceTeamNumber !== teamNumber) {
        throw new Forbidden('You cannot change another team’s scouter roster');
      }

      const updated = await repository.update(uuid, changes);
      if (!updated) throw new NotFound('Scouter not found');
      return updated;
    },
    async progress(userId: string, options: { archived?: boolean; tournamentKey?: string }) {
      const account = await getAccount(userId);
      const teamNumber = requireVerifiedTeam(account);
      requireScoutingLead(account);
      return repository.progress(teamNumber, options.archived, options.tournamentKey);
    },
    async reports(userId: string, uuid: string, tournamentKey?: string) {
      const account = await getAccount(userId);
      const teamNumber = requireVerifiedTeam(account);
      requireScoutingLead(account);
      const scouter = await repository.findById(uuid);
      if (!scouter) throw new NotFound('Scouter not found');
      if (scouter.sourceTeamNumber !== teamNumber)
        throw new Forbidden('You cannot view another team’s scouter reports');
      return repository.listReports(uuid, tournamentKey);
    },
  };
}

export type ScoutersService = ReturnType<typeof createScoutersService>;
