import { NotFound } from '../../platform/http/errors';
import type { TeamListOptions, TeamsRepository } from './teams.repository';

type ListOptions = Pick<TeamListOptions, 'filter' | 'limit' | 'offset'>;

export function createTeamsService(repository: TeamsRepository) {
  return {
    async list(userId: string, options: ListOptions) {
      const userTeamNumber = await repository.findUserTeamNumber(userId);
      if (userTeamNumber === undefined) throw new NotFound('Account not found');
      return repository.list({ ...options, userTeamNumber });
    },
  };
}

export type TeamsService = ReturnType<typeof createTeamsService>;
