import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../platform/database/client';
import { registeredTeams, sharedPicklists, users } from '../../platform/database/schema';

export type SharedPicklist = typeof sharedPicklists.$inferSelect;
export type SharedPicklistRecord = SharedPicklist & {
  authorTeamNumber: number | null;
  authorUsername: string | null;
};
export interface SharedPicklistsRepository {
  findAccount(
    userId: string
  ): Promise<{ id: string; teamNumber: number; verified: boolean } | null>;
  list(teamNumber: number): Promise<SharedPicklistRecord[]>;
  find(uuid: string): Promise<SharedPicklistRecord | null>;
  create(values: typeof sharedPicklists.$inferInsert): Promise<SharedPicklist>;
  update(
    uuid: string,
    values: Omit<typeof sharedPicklists.$inferInsert, 'uuid'>
  ): Promise<SharedPicklist | null>;
  delete(uuid: string): Promise<boolean>;
}
export function createSharedPicklistsRepository(database: Database): SharedPicklistsRepository {
  const selection = {
    uuid: sharedPicklists.uuid,
    name: sharedPicklists.name,
    totalPoints: sharedPicklists.totalPoints,
    autoPoints: sharedPicklists.autoPoints,
    teleopPoints: sharedPicklists.teleopPoints,
    authorId: sharedPicklists.authorId,
    autoClimb: sharedPicklists.autoClimb,
    campingDefenseTime: sharedPicklists.campingDefenseTime,
    climbResult: sharedPicklists.climbResult,
    contactDefenseTime: sharedPicklists.contactDefenseTime,
    driverAbility: sharedPicklists.driverAbility,
    defenseEffectiveness: sharedPicklists.defenseEffectiveness,
    estimatedSuccessfulFuelRate: sharedPicklists.estimatedSuccessfulFuelRate,
    estimatedTotalFuelScored: sharedPicklists.estimatedTotalFuelScored,
    feedingRate: sharedPicklists.feedingRate,
    scoringRate: sharedPicklists.scoringRate,
    totalDefensiveTime: sharedPicklists.totalDefensiveTime,
    totalFuelFed: sharedPicklists.totalFuelFed,
    totalFuelThroughput: sharedPicklists.totalFuelThroughput,
    authorTeamNumber: users.teamNumber,
    authorUsername: users.username,
  };
  return {
    async findAccount(userId) {
      const [row] = await database
        .select({
          id: users.id,
          teamNumber: users.teamNumber,
          verified: registeredTeams.emailVerified,
        })
        .from(users)
        .leftJoin(registeredTeams, eq(users.teamNumber, registeredTeams.number))
        .where(eq(users.id, userId))
        .limit(1);
      return row?.teamNumber !== null && row?.verified === true
        ? { id: row.id, teamNumber: row.teamNumber, verified: true }
        : null;
    },
    list(teamNumber) {
      return database
        .select(selection)
        .from(sharedPicklists)
        .innerJoin(users, eq(sharedPicklists.authorId, users.id))
        .where(eq(users.teamNumber, teamNumber))
        .orderBy(asc(sharedPicklists.name));
    },
    async find(uuid) {
      const [row] = await database
        .select(selection)
        .from(sharedPicklists)
        .innerJoin(users, eq(sharedPicklists.authorId, users.id))
        .where(eq(sharedPicklists.uuid, uuid))
        .limit(1);
      return row ?? null;
    },
    async create(values) {
      const [row] = await database.insert(sharedPicklists).values(values).returning();
      return row;
    },
    async update(uuid, values) {
      const [row] = await database
        .update(sharedPicklists)
        .set(values)
        .where(eq(sharedPicklists.uuid, uuid))
        .returning();
      return row ?? null;
    },
    async delete(uuid) {
      return (
        (
          await database
            .delete(sharedPicklists)
            .where(eq(sharedPicklists.uuid, uuid))
            .returning({ uuid: sharedPicklists.uuid })
        ).length > 0
      );
    },
  };
}
