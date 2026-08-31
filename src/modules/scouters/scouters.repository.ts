import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { registeredTeams, scouters, users } from '../../platform/database/schema';

export type Scouter = typeof scouters.$inferSelect;
export type ScouterPublic = Pick<Scouter, 'uuid' | 'name' | 'archived'>;
export type RosterAccount = Pick<typeof users.$inferSelect, 'id' | 'role' | 'teamNumber'> & {
  emailVerified: boolean | null;
};

export interface ScoutersRepository {
  findAccount(userId: string): Promise<RosterAccount | null>;
  findById(uuid: string): Promise<Scouter | null>;
  list(teamNumber: number, archived?: boolean): Promise<ScouterPublic[]>;
  create(teamNumber: number, name: string): Promise<ScouterPublic>;
  update(
    uuid: string,
    changes: { name?: string; archived?: boolean }
  ): Promise<ScouterPublic | null>;
}

const publicSelection = {
  uuid: scouters.uuid,
  name: scouters.name,
  archived: scouters.archived,
};

export function createScoutersRepository(database: Database): ScoutersRepository {
  return {
    async findAccount(userId) {
      const [account] = await database
        .select({
          id: users.id,
          role: users.role,
          teamNumber: users.teamNumber,
          emailVerified: registeredTeams.emailVerified,
        })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return account ?? null;
    },

    async findById(uuid) {
      const [scouter] = await database
        .select()
        .from(scouters)
        .where(eq(scouters.uuid, uuid))
        .limit(1);
      return scouter ?? null;
    },

    list(teamNumber, archived) {
      return database
        .select(publicSelection)
        .from(scouters)
        .where(
          archived === undefined
            ? eq(scouters.sourceTeamNumber, teamNumber)
            : and(eq(scouters.sourceTeamNumber, teamNumber), eq(scouters.archived, archived))
        )
        .orderBy(asc(scouters.archived), asc(scouters.name), asc(scouters.uuid));
    },

    async create(teamNumber, name) {
      const [scouter] = await database
        .insert(scouters)
        .values({ sourceTeamNumber: teamNumber, name })
        .returning(publicSelection);
      return scouter;
    },

    async update(uuid, changes) {
      const [scouter] = await database
        .update(scouters)
        .set(changes)
        .where(eq(scouters.uuid, uuid))
        .returning(publicSelection);
      return scouter ?? null;
    },
  };
}
