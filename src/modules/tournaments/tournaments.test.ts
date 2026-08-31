import { beforeEach, describe, expect, it } from 'bun:test';
import { createApp } from '../../app/create-app';
import type { AppDependencies } from '../../app/dependencies';
import type {
  Team,
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
      authenticator: {
        async authenticate(token) {
          return token === 'valid-token'
            ? { userId: 'analyst', role: 'ANALYST', tokenType: 'jwt' }
            : null;
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
  });
});
