import { Forbidden, NotFound } from '../../platform/http/errors';
import type { MutablePicklistsRepository } from './mutable-picklists.repository';

export function createMutablePicklistsService(repository: MutablePicklistsRepository) {
  async function account(id: string) {
    const row = await repository.findVerifiedAccount(id);
    if (!row) throw new Forbidden('A verified team is required');
    return row;
  }
  async function owned(id: string, uuid: string) {
    const user = await account(id);
    const row = await repository.find(uuid);
    if (!row) throw new NotFound('Picklist not found');
    if (row.authorTeamNumber !== user.teamNumber)
      throw new Forbidden('Picklist belongs to another team');
    return { user, row };
  }
  return {
    async list(id: string) {
      const user = await account(id);
      return repository.list(user.teamNumber);
    },
    async get(id: string, uuid: string) {
      return (await owned(id, uuid)).row;
    },
    async create(
      id: string,
      input: { name: string; teams: number[]; tournamentKey?: string | null }
    ) {
      const user = await account(id);
      const created = await repository.create({ ...input, authorId: user.id });
      return (await repository.find(created.uuid))!;
    },
    async update(
      id: string,
      uuid: string,
      input: { name: string; teams: number[]; tournamentKey?: string | null }
    ) {
      await owned(id, uuid);
      const row = await repository.update(uuid, {
        ...input,
        tournamentKey: input.tournamentKey ?? null,
      });
      if (!row) throw new NotFound('Picklist not found');
      return (await repository.find(uuid))!;
    },
    async delete(id: string, uuid: string) {
      await owned(id, uuid);
      if (!(await repository.delete(uuid))) throw new NotFound('Picklist not found');
    },
  };
}
export type MutablePicklistsService = ReturnType<typeof createMutablePicklistsService>;
