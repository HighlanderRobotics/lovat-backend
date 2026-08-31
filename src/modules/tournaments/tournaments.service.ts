import { NotFound } from '../../platform/http/errors';
import type { TournamentListOptions, TournamentsRepository } from './tournaments.repository';

type ListOptions = Pick<TournamentListOptions, 'filter' | 'limit' | 'offset'>;

export function createTournamentsService(repository: TournamentsRepository) {
  return {
    async list(userId: string, options: ListOptions) {
      const teamNumber = await repository.findUserTeamNumber(userId);
      if (teamNumber === undefined) throw new NotFound('Account not found');
      return repository.list({ ...options, teamNumber });
    },

    async listTeams(key: string) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      return repository.listTeams(key);
    },
  };
}

export type TournamentsService = ReturnType<typeof createTournamentsService>;
