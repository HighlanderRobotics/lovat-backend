import { beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import type {
  Team,
  MatchReportRow,
  Tournament,
  TournamentListOptions,
  TournamentsRepository,
} from './tournaments.repository';
import { createTournamentsService } from './tournaments.service';

const tournamentRows: Tournament[] = [
  {
    key: '2026alpha',
    name: 'Alpha Regional',
    location: 'Oakland, CA',
    date: '2026-03-01',
    latestFetchETag: null,
  },
  {
    key: '2026beta',
    name: 'Beta Regional',
    location: 'San Jose, CA',
    date: '2026-02-01',
    latestFetchETag: null,
  },
  {
    key: '2026champ',
    name: 'Championship',
    location: null,
    date: '2026-04-01',
    latestFetchETag: 'etag',
  },
];

const tournamentTeams = new Map<string, Team[]>([
  [
    '2026alpha',
    [
      { number: 8033, name: 'Highlander Robotics' },
      { number: 254, name: 'The Cheesy Poofs' },
    ],
  ],
]);

function createMemoryRepository(): TournamentsRepository {
  let storedShift: {
    uuid: string;
    sourceTeamNumber: number;
    tournamentKey: string;
    startMatchOrdinalNumber: number;
    endMatchOrdinalNumber: number;
  } | null = null;
  return {
    async findUserTeamNumber(userId) {
      if (userId === 'missing') return undefined;
      return userId === 'no-team' ? null : 8033;
    },
    async list(options: TournamentListOptions) {
      const filter = options.filter?.toLowerCase();
      const matching = tournamentRows.filter(
        ({ key, name }) =>
          !filter || key.toLowerCase().includes(filter) || name.toLowerCase().includes(filter)
      );
      const summaries = matching
        .map((tournament) => ({
          ...tournament,
          isParticipant: options.teamNumber === 8033 && tournament.key === '2026alpha',
        }))
        .sort(
          (left, right) =>
            Number(right.isParticipant) - Number(left.isParticipant) ||
            (left.date ?? '').localeCompare(right.date ?? '') ||
            left.key.localeCompare(right.key)
        );
      return {
        tournaments: summaries.slice(options.offset, options.offset + options.limit),
        count: summaries.length,
      };
    },
    async exists(key) {
      return tournamentRows.some((tournament) => tournament.key === key);
    },
    async listTeams(key) {
      return [...(tournamentTeams.get(key) ?? [])].sort((a, b) => a.number - b.number);
    },
    async findVerifiedUserTeamNumber(userId) {
      return userId === 'unverified' ? null : 8033;
    },
    async listScouterShifts() {
      return [
        {
          uuid: '00000000-0000-4000-8000-000000000010',
          startMatchOrdinalNumber: 1,
          endMatchOrdinalNumber: 5,
          team1: [{ uuid: '00000000-0000-4000-8000-000000000011', name: 'Scout One' }],
          team2: [],
          team3: [],
          team4: [],
          team5: [],
          team6: [],
        },
      ];
    },
    async findScheduleAccount(userId) {
      return {
        teamNumber: 8033,
        role: userId === 'lead' ? 'SCOUTING_LEAD' : 'ANALYST',
        emailVerified: true,
        teamSourceRule: { mode: 'EXCLUDE', items: [] },
      };
    },
    async findShift(uuid) {
      return storedShift?.uuid === uuid ? storedShift : null;
    },
    async findTeamMatch(input) {
      if (
        input.tournamentKey !== '2026alpha' ||
        input.teamNumber !== 8033 ||
        input.matchNumber !== 1 ||
        input.matchType !== 'QUALIFICATION'
      )
        return null;
      return {
        key: '2026alpha_qm1_0',
        tournamentKey: '2026alpha',
        matchNumber: 1,
        teamNumber: 8033,
        matchType: 'QUALIFICATION',
      };
    },
    async findTeamNumberByCode(code) {
      return code === 'team-8033' ? 8033 : null;
    },
    async listScheduledTournaments(teamNumber) {
      return teamNumber === 8033 ? [tournamentRows[0]] : [];
    },
    async listMatchReportRows(key) {
      if (key !== '2026alpha') return [];
      return [8033, 254, 1678, 4414, 5940, 971].flatMap<MatchReportRow>((teamNumber, station) => {
        const base = {
          key: `2026alpha_qm1_${station}`,
          matchNumber: 1,
          matchType: 'QUALIFICATION' as const,
          teamNumber,
        };
        if (station === 0)
          return [
            {
              ...base,
              reportUuid: 'report-own',
              reportScouterUuid: '00000000-0000-4000-8000-000000000011',
              reportScouterName: 'Scout One',
              reportSourceTeamNumber: 8033,
            },
          ];
        if (station === 1)
          return [
            {
              ...base,
              reportUuid: 'report-external',
              reportScouterUuid: 'external-scout',
              reportScouterName: 'External',
              reportSourceTeamNumber: 254,
            },
          ];
        return [
          {
            ...base,
            reportUuid: null,
            reportScouterUuid: null,
            reportScouterName: null,
            reportSourceTeamNumber: null,
          },
        ];
      });
    },
    async hasOverlappingShift(_team, _key, start) {
      return start === 99;
    },
    async findActiveScouterIds(_team, ids) {
      return ids;
    },
    async createShift(teamNumber, tournamentKey, input) {
      storedShift = {
        uuid: '00000000-0000-4000-8000-000000000020',
        sourceTeamNumber: teamNumber,
        tournamentKey,
        startMatchOrdinalNumber: input.startMatchOrdinalNumber,
        endMatchOrdinalNumber: input.endMatchOrdinalNumber,
      };
      return storedShift.uuid;
    },
    async updateShift(uuid, input) {
      if (!storedShift || storedShift.uuid !== uuid) return false;
      storedShift = { ...storedShift, ...input };
      return true;
    },
    async deleteShift(uuid) {
      if (!storedShift || storedShift.uuid !== uuid) return false;
      storedShift = null;
      return true;
    },
  };
}

describe('tournaments module', () => {
  let dependencies: AppDependencies;

  beforeEach(() => {
    dependencies = {
      tournaments: createTournamentsService(createMemoryRepository()),
      accounts: {
        async getRequired() {
          throw new Error('Not used by this test');
        },
        async delete() {
          throw new Error('Not used by this test');
        },
        async updateSettings() {
          throw new Error('Not used by this test');
        },
        async listTeamMembers() {
          return [];
        },
        async listAnalysts() {
          return [];
        },
        async promoteToScoutingLead() {
          throw new Error('Not used by this test');
        },
      },
      apiKeys: {
        async list() {
          return [];
        },
        async create() {
          throw new Error('Not used by this test');
        },
        async rename() {
          throw new Error('Not used by this test');
        },
        async revoke() {
          throw new Error('Not used by this test');
        },
      },
      teams: {
        async list() {
          return { teams: [], count: 0 };
        },
      },
      scouters: {
        async checkTeamCode() {
          return { valid: false as const };
        },
        async listByTeamCode() {
          return [];
        },
        async list() {
          return [];
        },
        async create() {
          throw new Error('Not used by this test');
        },
        async update() {
          throw new Error('Not used by this test');
        },
      },
      mutablePicklists: unusedMutablePicklists,
      sharedPicklists: unusedMutablePicklists,
      scoutReports: unusedScoutReports,
      authenticator: {
        async authenticate(token) {
          if (token === 'valid-token')
            return { userId: 'analyst', role: 'ANALYST', tokenType: 'jwt' };
          if (token === 'lead-token')
            return { userId: 'lead', role: 'SCOUTING_LEAD', tokenType: 'jwt' };
          return null;
        },
      },
      apiVersion: 'test',
    };
  });

  it('lists participating tournaments first and reports the filtered count', async () => {
    const response = await createApp(dependencies).request('/v2/tournaments', {
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      tournaments: { key: string; isParticipant: boolean }[];
      count: number;
    };
    expect(body.count).toBe(3);
    expect(body.tournaments.map(({ key }) => key)).toEqual(['2026alpha', '2026beta', '2026champ']);
    expect(body.tournaments[0].isParticipant).toBe(true);
  });

  it('filters before applying bounded pagination', async () => {
    const response = await createApp(dependencies).request(
      '/v2/tournaments?filter=regional&limit=1&offset=1',
      { headers: { authorization: 'Bearer valid-token' } }
    );
    const body = (await response.json()) as { tournaments: { key: string }[]; count: number };
    expect(body.count).toBe(2);
    expect(body.tournaments.map(({ key }) => key)).toEqual(['2026beta']);
  });

  it('returns unique tournament teams in team-number order', async () => {
    const response = await createApp(dependencies).request('/v2/tournaments/2026alpha/teams', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      teams: [
        { number: 254, name: 'The Cheesy Poofs' },
        { number: 8033, name: 'Highlander Robotics' },
      ],
    });
  });

  it('returns not found for an unknown tournament', async () => {
    const response = await createApp(dependencies).request('/v2/tournaments/unknown/teams', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: 'NOT_FOUND', message: 'Tournament not found' },
    });
  });

  it('standardizes validation failures and documents both routes', async () => {
    const app = createApp(dependencies);
    const invalid = await app.request('/v2/tournaments?limit=101', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Invalid request' },
    });

    const specification = JSON.stringify(await (await app.request('/v2/openapi.json')).json());
    expect(specification).toContain('/v2/tournaments');
    expect(specification).toContain('/v2/tournaments/{key}/teams');
    expect(specification).toContain('/v2/tournaments/{key}/scouter-shifts');
  });

  it('returns the verified team schedule with a deterministic content hash', async () => {
    const app = createApp(dependencies);
    const first = await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const second = await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
      headers: { authorization: 'Bearer valid-token' },
    });
    const firstBody = (await first.json()) as { hash: string; data: unknown[] };
    const secondBody = (await second.json()) as { hash: string; data: unknown[] };
    expect(first.status).toBe(200);
    expect(firstBody.hash).toHaveLength(64);
    expect(secondBody.hash).toBe(firstBody.hash);
    expect(firstBody.data).toHaveLength(1);
  });

  it('allows scouting leads to create, update, and delete shifts', async () => {
    const app = createApp(dependencies);
    const body = {
      startMatchOrdinalNumber: 6,
      endMatchOrdinalNumber: 10,
      team1: ['00000000-0000-4000-8000-000000000011'],
      team2: [],
      team3: [],
      team4: [],
      team5: [],
      team6: [],
    };
    const created = await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
      method: 'POST',
      headers: { authorization: 'Bearer lead-token', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(created.status).toBe(201);
    const { uuid } = (await created.json()) as { uuid: string };
    const updated = await app.request(`/v2/tournaments/2026alpha/scouter-shifts/${uuid}`, {
      method: 'PUT',
      headers: { authorization: 'Bearer lead-token', 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, endMatchOrdinalNumber: 12 }),
    });
    expect(updated.status).toBe(204);
    expect(
      (
        await app.request(`/v2/tournaments/2026alpha/scouter-shifts/${uuid}`, {
          method: 'DELETE',
          headers: { authorization: 'Bearer lead-token' },
        })
      ).status
    ).toBe(204);
  });

  it('rejects analyst mutations, duplicate assignments, and overlapping ranges', async () => {
    const app = createApp(dependencies);
    const uuid = '00000000-0000-4000-8000-000000000011';
    const base = {
      startMatchOrdinalNumber: 6,
      endMatchOrdinalNumber: 10,
      team1: [uuid],
      team2: [],
      team3: [],
      team4: [],
      team5: [],
      team6: [],
    };
    expect(
      (
        await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
          method: 'POST',
          headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
          body: JSON.stringify(base),
        })
      ).status
    ).toBe(403);
    expect(
      (
        await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
          method: 'POST',
          headers: { authorization: 'Bearer lead-token', 'content-type': 'application/json' },
          body: JSON.stringify({ ...base, team2: [uuid] }),
        })
      ).status
    ).toBe(400);
    expect(
      (
        await app.request('/v2/tournaments/2026alpha/scouter-shifts', {
          method: 'POST',
          headers: { authorization: 'Bearer lead-token', 'content-type': 'application/json' },
          body: JSON.stringify({
            ...base,
            startMatchOrdinalNumber: 99,
            endMatchOrdinalNumber: 100,
          }),
        })
      ).status
    ).toBe(400);
  });

  it('checks match participation publicly and identifies the alliance', async () => {
    const app = createApp(dependencies);
    const response = await app.request(
      '/v2/tournaments/matches/check?tournamentKey=2026alpha&teamNumber=8033&matchNumber=1&isElim=false'
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      match: {
        key: '2026alpha_qm1_0',
        tournamentKey: '2026alpha',
        matchNumber: 1,
        teamNumber: 8033,
        matchType: 'QUALIFICATION',
      },
      alliance: 'red',
    });
    expect(
      (
        await app.request(
          '/v2/tournaments/matches/check?tournamentKey=2026alpha&teamNumber=8033&matchNumber=2&isElim=false'
        )
      ).status
    ).toBe(404);
  });

  it('lists match scouting progress, external reports, assignments, and team filters', async () => {
    const app = createApp(dependencies);
    const response = await app.request('/v2/tournaments/2026alpha/matches', {
      headers: { authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(200);
    const [match] = (await response.json()) as {
      matchNumber: number;
      scouted: boolean;
      finished: boolean;
      team1: { scouters: { name: string; scouted: boolean }[]; externalReports: number };
      team2: { externalReports: number };
    }[];
    expect(match.matchNumber).toBe(1);
    expect(match.scouted).toBe(true);
    expect(match.finished).toBe(true);
    expect(match.team1.scouters).toEqual([{ name: 'Scout One', scouted: true }]);
    expect(match.team1.externalReports).toBe(0);
    expect(match.team2.externalReports).toBe(1);

    const filtered = await app.request(
      `/v2/tournaments/2026alpha/matches?teams=${encodeURIComponent('[9999]')}`,
      { headers: { authorization: 'Bearer valid-token' } }
    );
    expect(await filtered.json()).toEqual([]);
    expect((await app.request('/v2/tournaments/2026alpha/matches')).status).toBe(401);
  });

  it('returns code-authenticated mobile scouter assignments without dashboard auth', async () => {
    const app = createApp(dependencies);
    const response = await app.request('/v2/tournaments/public/2026alpha/scouter-schedule', {
      headers: { 'x-team-code': 'team-8033' },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      hash: string;
      data: { matchType: number; matchNumber: number; scouters: Record<string, unknown> }[];
    };
    expect(body.hash).toHaveLength(64);
    expect(body.data).toEqual([
      {
        matchType: 0,
        matchNumber: 1,
        scouters: {
          '00000000-0000-4000-8000-000000000011': { team: 8033, alliance: 'red' },
        },
      },
    ]);
    expect(
      (
        await app.request('/v2/tournaments/public/2026alpha/scouter-schedule', {
          headers: { 'x-team-code': 'wrong' },
        })
      ).status
    ).toBe(404);
  });

  it('provides code-authenticated tournament discovery and scheduled-event views', async () => {
    const app = createApp(dependencies);
    const catalog = await app.request('/v2/tournaments/public?limit=2', {
      headers: { 'x-team-code': 'team-8033' },
    });
    expect(catalog.status).toBe(200);
    const body = (await catalog.json()) as {
      tournaments: { key: string; isParticipant: boolean }[];
      count: number;
    };
    expect(body.count).toBe(3);
    expect(body.tournaments[0]).toMatchObject({ key: '2026alpha', isParticipant: true });

    const scheduled = await app.request('/v2/tournaments/public/scheduled', {
      headers: { 'x-team-code': 'team-8033' },
    });
    expect(scheduled.status).toBe(200);
    expect(
      ((await scheduled.json()) as { tournaments: { key: string }[] }).tournaments.map(
        ({ key }) => key
      )
    ).toEqual(['2026alpha']);
  });
});

const unusedMutablePicklists = {
  async list() {
    return [];
  },
  async get() {
    throw new Error('Not used by this test');
  },
  async create() {
    throw new Error('Not used by this test');
  },
  async update() {
    throw new Error('Not used by this test');
  },
  async delete() {
    throw new Error('Not used by this test');
  },
};
const unusedScoutReports = {
  async createPublic() {
    throw new Error('Not used by this test');
  },
  async create() {
    throw new Error('Not used by this test');
  },
  async get() {
    throw new Error('Not used by this test');
  },
  async updateNotes() {
    throw new Error('Not used by this test');
  },
  async delete() {
    throw new Error('Not used by this test');
  },
  async timeline() {
    return [];
  },
};
