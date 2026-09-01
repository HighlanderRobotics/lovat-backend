import { z } from 'zod';

const TeamEventStatusSchema = z
  .object({
    qual: z
      .object({
        ranking: z.object({
          rank: z.number().int().positive(),
          matches_played: z.number().int().nonnegative(),
          sort_orders: z.array(z.number()),
        }),
      })
      .nullable(),
  })
  .nullable();

export type TeamEventStatus = {
  rank: number | null;
  matchesPlayed: number | null;
  rankingPoints: number | null;
};

export interface TbaClient {
  getTeamEventStatus(eventKey: string, teamNumber: number): Promise<TeamEventStatus>;
}

type TbaFetch = (
  input: string,
  init?: { headers?: Record<string, string> }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export function createTbaClient(
  authKey: string | undefined,
  fetcher: TbaFetch = globalThis.fetch
): TbaClient {
  return {
    async getTeamEventStatus(eventKey, teamNumber) {
      if (!authKey) throw new Error('TBA_KEY is not configured');
      const response = await fetcher(
        `https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/event/${encodeURIComponent(eventKey)}/status`,
        { headers: { 'X-TBA-Auth-Key': authKey } }
      );
      if (!response.ok) throw new Error(`The Blue Alliance request failed (${response.status})`);
      const status = TeamEventStatusSchema.parse(await response.json());
      if (!status?.qual) return { rank: null, matchesPlayed: null, rankingPoints: null };
      const { ranking } = status.qual;
      return {
        rank: ranking.rank,
        matchesPlayed: ranking.matches_played,
        rankingPoints:
          ranking.sort_orders[0] === undefined
            ? null
            : Math.round(ranking.sort_orders[0] * ranking.matches_played),
      };
    },
  };
}
