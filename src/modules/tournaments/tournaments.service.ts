import { BadRequest, Forbidden, NotFound } from '../../platform/http/errors';
import { createHash } from 'node:crypto';
import type {
  ShiftWrite,
  TournamentListOptions,
  TournamentsRepository,
} from './tournaments.repository';

type ListOptions = Pick<TournamentListOptions, 'filter' | 'limit' | 'offset'>;

export function createTournamentsService(repository: TournamentsRepository) {
  async function scheduleAccount(userId: string, requireLead = false) {
    const account = await repository.findScheduleAccount(userId);
    if (!account || account.teamNumber === null || account.emailVerified !== true)
      throw new Forbidden('A verified team is required');
    if (requireLead && account.role !== 'SCOUTING_LEAD')
      throw new Forbidden('Only scouting leads can change schedules');
    return account.teamNumber;
  }
  async function validateShift(
    teamNumber: number,
    key: string,
    input: ShiftWrite,
    excludeUuid?: string
  ) {
    const ids = [
      ...input.team1,
      ...input.team2,
      ...input.team3,
      ...input.team4,
      ...input.team5,
      ...input.team6,
    ];
    if (new Set(ids).size !== ids.length)
      throw new BadRequest('A scouter may only appear once in a shift');
    const active = await repository.findActiveScouterIds(teamNumber, ids);
    if (active.length !== ids.length)
      throw new BadRequest('Every assigned scouter must be active and on your team');
    if (
      await repository.hasOverlappingShift(
        teamNumber,
        key,
        input.startMatchOrdinalNumber,
        input.endMatchOrdinalNumber,
        excludeUuid
      )
    )
      throw new BadRequest('Shift overlaps an existing shift');
  }
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
    async createScouterShift(userId: string, key: string, input: ShiftWrite) {
      if (!(await repository.exists(key))) throw new NotFound('Tournament not found');
      const teamNumber = await scheduleAccount(userId, true);
      await validateShift(teamNumber, key, input);
      return { uuid: await repository.createShift(teamNumber, key, input) };
    },
    async updateScouterShift(userId: string, key: string, uuid: string, input: ShiftWrite) {
      const teamNumber = await scheduleAccount(userId, true);
      const shift = await repository.findShift(uuid);
      if (!shift || shift.tournamentKey !== key) throw new NotFound('Scouter shift not found');
      if (shift.sourceTeamNumber !== teamNumber)
        throw new Forbidden('Scouter shift belongs to another team');
      await validateShift(teamNumber, key, input, uuid);
      if (!(await repository.updateShift(uuid, input)))
        throw new NotFound('Scouter shift not found');
    },
    async deleteScouterShift(userId: string, key: string, uuid: string) {
      const teamNumber = await scheduleAccount(userId, true);
      const shift = await repository.findShift(uuid);
      if (!shift || shift.tournamentKey !== key) throw new NotFound('Scouter shift not found');
      if (shift.sourceTeamNumber !== teamNumber)
        throw new Forbidden('Scouter shift belongs to another team');
      if (!(await repository.deleteShift(uuid))) throw new NotFound('Scouter shift not found');
    },
  };
}

export type TournamentsService = ReturnType<typeof createTournamentsService>;
