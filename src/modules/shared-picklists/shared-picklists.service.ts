import { Forbidden, NotFound } from '../../platform/http/errors';
import type { SharedPicklistsRepository } from './shared-picklists.repository';

export type SharedPicklistWrite = {
  name: string;
  totalPoints: number;
  autoPoints: number;
  teleopPoints: number;
  climbResult: number;
  autoClimb: number;
  defenseEffectiveness: number;
  contactDefenseTime: number;
  campingDefenseTime: number;
  totalDefensiveTime: number;
  totalFuelThroughput: number;
  totalFuelFed: number;
  feedingRate: number;
  scoringRate: number;
  estimatedSuccessfulFuelRate: number;
  estimatedTotalFuelScored: number;
  driverAbility: number;
};
export function createSharedPicklistsService(repository: SharedPicklistsRepository) {
  async function account(userId: string) {
    const row = await repository.findAccount(userId);
    if (!row) throw new Forbidden('A verified team is required');
    return row;
  }
  async function accessible(userId: string, uuid: string) {
    const [user, row] = await Promise.all([account(userId), repository.find(uuid)]);
    if (!row) throw new NotFound('Shared picklist not found');
    if (row.authorTeamNumber !== user.teamNumber)
      throw new Forbidden('Shared picklist belongs to another team');
    return { user, row };
  }
  return {
    async list(userId: string) {
      return repository.list((await account(userId)).teamNumber);
    },
    async get(userId: string, uuid: string) {
      return (await accessible(userId, uuid)).row;
    },
    async create(userId: string, input: SharedPicklistWrite) {
      const user = await account(userId);
      const created = await repository.create({ ...input, authorId: user.id });
      return (await repository.find(created.uuid))!;
    },
    async update(userId: string, uuid: string, input: SharedPicklistWrite) {
      const { user } = await accessible(userId, uuid);
      if (!(await repository.update(uuid, { ...input, authorId: user.id })))
        throw new NotFound('Shared picklist not found');
      return (await repository.find(uuid))!;
    },
    async delete(userId: string, uuid: string) {
      await accessible(userId, uuid);
      if (!(await repository.delete(uuid))) throw new NotFound('Shared picklist not found');
    },
  };
}
export type SharedPicklistsService = ReturnType<typeof createSharedPicklistsService>;
