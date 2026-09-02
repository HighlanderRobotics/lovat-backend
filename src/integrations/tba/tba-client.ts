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

export type ImportedTeamMatch = {
  key: string;
  tournamentKey: string;
  matchNumber: number;
  teamNumber: number;
  matchType: 'QUALIFICATION' | 'ELIMINATION';
};

export type EventMatchRefresh =
  | { notModified: true }
  | { notModified: false; etag: string | null; matches: ImportedTeamMatch[] };

export type QualificationPredictionMatch = {
  matchNumber: number;
  predictedTime: number;
  redTeams: number[];
  blueTeams: number[];
  redScore: number;
  blueScore: number;
  winningAlliance: 'red' | 'blue' | '';
  redRankingPoints: number;
  blueRankingPoints: number;
};

export type EventPredictionData = {
  teams: number[];
  matches: QualificationPredictionMatch[];
};

export interface TbaClient {
  getTeamEventStatus(eventKey: string, teamNumber: number): Promise<TeamEventStatus>;
  getEventMatches(eventKey: string, etag: string | null): Promise<EventMatchRefresh>;
  getEventPredictionData(eventKey: string): Promise<EventPredictionData>;
}

type TbaFetch = (
  input: string,
  init?: { headers?: Record<string, string> }
) => Promise<{
  ok: boolean;
  status: number;
  headers?: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

const EventSchema = z.object({
  playoff_type: z.number().int().nullable().optional(),
  remap_teams: z.record(z.string(), z.string()).nullable().optional(),
});
const EventMatchSchema = z.object({
  key: z.string(),
  comp_level: z.string(),
  match_number: z.number().int().positive(),
  alliances: z.object({
    red: z.object({ team_keys: z.array(z.string()) }),
    blue: z.object({ team_keys: z.array(z.string()) }),
  }),
});
const PredictionMatchSchema = z.object({
  comp_level: z.string(),
  match_number: z.number().int().positive(),
  predicted_time: z.number().nullable().optional(),
  winning_alliance: z.enum(['red', 'blue', '']),
  alliances: z.object({
    red: z.object({ team_keys: z.array(z.string()), score: z.number() }),
    blue: z.object({ team_keys: z.array(z.string()), score: z.number() }),
  }),
  score_breakdown: z
    .object({
      red: z.object({ rp: z.number().optional() }).nullable().optional(),
      blue: z.object({ rp: z.number().optional() }).nullable().optional(),
    })
    .nullable()
    .optional(),
});
const SimpleTeamSchema = z.object({ team_number: z.number().int().positive() });
const playoffOrder = {
  10: [
    'sf1m1',
    'sf2m1',
    'sf3m1',
    'sf4m1',
    'sf5m1',
    'sf6m1',
    'sf7m1',
    'sf8m1',
    'sf9m1',
    'sf10m1',
    'sf11m1',
    'sf12m1',
    'sf13m1',
    'f1m1',
    'f1m2',
  ],
  11: ['sf1m1', 'sf2m1', 'sf3m1', 'sf4m1', 'sf5m1', 'f1m1', 'f1m2'],
} as const;

function teamNumber(teamKey: string, remaps: Record<string, string>) {
  const realKey = Object.entries(remaps).find(([, fake]) => fake === teamKey)?.[0] ?? teamKey;
  const value = Number(realKey.replace(/^frc/, ''));
  return Number.isInteger(value) && value > 0 ? value : null;
}

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
    async getEventMatches(eventKey, etag) {
      if (!authKey) throw new Error('TBA_KEY is not configured');
      const base = 'https://www.thebluealliance.com/api/v3';
      const headers = { 'X-TBA-Auth-Key': authKey };
      const [eventResponse, matchesResponse] = await Promise.all([
        fetcher(`${base}/event/${encodeURIComponent(eventKey)}`, { headers }),
        fetcher(`${base}/event/${encodeURIComponent(eventKey)}/matches`, {
          headers: etag ? { ...headers, 'If-None-Match': etag } : headers,
        }),
      ]);
      if (!eventResponse.ok)
        throw new Error(`The Blue Alliance event request failed (${eventResponse.status})`);
      if (matchesResponse.status === 304) return { notModified: true };
      if (!matchesResponse.ok)
        throw new Error(`The Blue Alliance matches request failed (${matchesResponse.status})`);
      const event = EventSchema.parse(await eventResponse.json());
      const sourceMatches = z.array(EventMatchSchema).parse(await matchesResponse.json());
      const remaps = event.remap_teams ?? {};
      const matches: ImportedTeamMatch[] = [];
      for (const match of sourceMatches) {
        const keys = [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys];
        if (keys.length !== 6) continue;
        const teams = keys.map((key) => teamNumber(key, remaps));
        if (teams.some((number) => number === null)) continue;
        let matchType: ImportedTeamMatch['matchType'];
        let matchNumber: number;
        if (match.comp_level === 'qm') {
          matchType = 'QUALIFICATION';
          matchNumber = match.match_number;
        } else {
          const order: readonly string[] | undefined = playoffOrder[event.playoff_type as 10 | 11];
          const suffix = match.key.split('_')[1] ?? '';
          const index = order?.indexOf(suffix) ?? -1;
          if (index < 0) continue;
          matchType = 'ELIMINATION';
          matchNumber = index + 1;
        }
        teams.forEach((number, station) =>
          matches.push({
            key: `${eventKey}_${matchType === 'QUALIFICATION' ? 'qm' : 'em'}${matchNumber}_${station}`,
            tournamentKey: eventKey,
            matchNumber,
            teamNumber: number!,
            matchType,
          })
        );
      }
      return {
        notModified: false,
        etag: matchesResponse.headers?.get('etag') ?? null,
        matches,
      };
    },
    async getEventPredictionData(eventKey) {
      if (!authKey) throw new Error('TBA_KEY is not configured');
      const base = 'https://www.thebluealliance.com/api/v3';
      const headers = { 'X-TBA-Auth-Key': authKey };
      const [matchesResponse, teamsResponse] = await Promise.all([
        fetcher(`${base}/event/${encodeURIComponent(eventKey)}/matches`, { headers }),
        fetcher(`${base}/event/${encodeURIComponent(eventKey)}/teams/simple`, { headers }),
      ]);
      if (!matchesResponse.ok || !teamsResponse.ok)
        throw new Error('Failed to fetch match or team data from TBA');
      const sourceMatches = z.array(PredictionMatchSchema).parse(await matchesResponse.json());
      const sourceTeams = z.array(SimpleTeamSchema).parse(await teamsResponse.json());
      return {
        teams: sourceTeams.map(({ team_number }) => team_number),
        matches: sourceMatches
          .filter(({ comp_level }) => comp_level === 'qm')
          .map((match) => ({
            matchNumber: match.match_number,
            predictedTime: match.predicted_time ?? 0,
            redTeams: match.alliances.red.team_keys.map((key) => Number(key.replace(/^frc/, ''))),
            blueTeams: match.alliances.blue.team_keys.map((key) => Number(key.replace(/^frc/, ''))),
            redScore: match.alliances.red.score,
            blueScore: match.alliances.blue.score,
            winningAlliance: match.winning_alliance,
            redRankingPoints: match.score_breakdown?.red?.rp ?? 0,
            blueRankingPoints: match.score_breakdown?.blue?.rp ?? 0,
          }))
          .filter(
            ({ redTeams, blueTeams }) =>
              redTeams.length === 3 &&
              blueTeams.length === 3 &&
              [...redTeams, ...blueTeams].every((team) => Number.isInteger(team) && team > 0)
          )
          .sort((left, right) => left.predictedTime - right.predictedTime),
      };
    },
  };
}
