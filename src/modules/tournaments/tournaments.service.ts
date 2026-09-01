import { NotFound } from '../../platform/http/errors';
import { Forbidden } from '../../platform/http/errors';
import { createHash } from 'node:crypto';
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

    async getScouterSchedule(userId: string, key: string) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const teamNumber = await repository.findVerifiedUserTeamNumber(userId);
      if (teamNumber === null) throw new Forbidden('A verified team is required');
      const data = await repository.listScouterShifts(teamNumber, key);
      return {
        hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
        data,
      };
    },
  };
}

export type TournamentsService = ReturnType<typeof createTournamentsService>;
