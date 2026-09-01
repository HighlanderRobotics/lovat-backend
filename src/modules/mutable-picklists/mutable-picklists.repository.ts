import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { mutablePicklists, registeredTeams, users } from '../../platform/database/schema';

export type MutablePicklist = typeof mutablePicklists.$inferSelect;
export interface MutablePicklistsRepository {
  findVerifiedAccount(id: string): Promise<{ id: string; teamNumber: number } | null>;
  list(
    teamNumber: number
  ): Promise<(Omit<MutablePicklist, 'authorId'> & { authorUsername: string | null })[]>;
  find(
    uuid: string
  ): Promise<
    (MutablePicklist & { authorTeamNumber: number | null; authorUsername: string | null }) | null
  >;
  create(values: typeof mutablePicklists.$inferInsert): Promise<MutablePicklist>;
  update(
    uuid: string,
    values: Pick<MutablePicklist, 'name' | 'teams' | 'tournamentKey'>
  ): Promise<MutablePicklist | null>;
  delete(uuid: string): Promise<boolean>;
}

export function createMutablePicklistsRepository(database: Database): MutablePicklistsRepository {
  return {
    async findVerifiedAccount(id) {
      const [row] = await database
        .select({
          id: users.id,
          teamNumber: users.teamNumber,
          verified: registeredTeams.emailVerified,
        })
        .from(users)
        .innerJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, id))
        .limit(1);
      return row?.teamNumber !== null && row?.verified
        ? { id: row.id, teamNumber: row.teamNumber }
        : null;
    },
    list(teamNumber) {
      return database
        .select({
          uuid: mutablePicklists.uuid,
          teams: mutablePicklists.teams,
          name: mutablePicklists.name,
          tournamentKey: mutablePicklists.tournamentKey,
          authorUsername: users.username,
        })
        .from(mutablePicklists)
        .innerJoin(users, eq(mutablePicklists.authorId, users.id))
        .where(eq(users.teamNumber, teamNumber))
        .orderBy(asc(mutablePicklists.name));
    },
    async find(uuid) {
      const [row] = await database
        .select({
          uuid: mutablePicklists.uuid,
          teams: mutablePicklists.teams,
          authorId: mutablePicklists.authorId,
          name: mutablePicklists.name,
          tournamentKey: mutablePicklists.tournamentKey,
          authorTeamNumber: users.teamNumber,
          authorUsername: users.username,
        })
        .from(mutablePicklists)
        .innerJoin(users, eq(mutablePicklists.authorId, users.id))
        .where(eq(mutablePicklists.uuid, uuid))
        .limit(1);
      return row ?? null;
    },
    async create(values) {
      const [row] = await database.insert(mutablePicklists).values(values).returning();
      return row;
    },
    async update(uuid, values) {
      const [row] = await database
        .update(mutablePicklists)
        .set(values)
        .where(eq(mutablePicklists.uuid, uuid))
        .returning();
      return row ?? null;
    },
    async delete(uuid) {
      return (
        (
          await database
            .delete(mutablePicklists)
            .where(eq(mutablePicklists.uuid, uuid))
            .returning({ uuid: mutablePicklists.uuid })
        ).length > 0
      );
    },
  };
}
