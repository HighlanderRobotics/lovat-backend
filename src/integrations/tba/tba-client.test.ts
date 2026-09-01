import { describe, expect, it } from 'bun:test';
import { createTbaClient } from './tba-client';

describe('The Blue Alliance client', () => {
  it('maps qualification rankings and computes the legacy ranking-point total', async () => {
    let requestedUrl = '';
    let requestedKey = '';
    const client = createTbaClient('secret', async (input, init) => {
      requestedUrl = String(input);
      requestedKey = new globalThis.Headers(init?.headers).get('X-TBA-Auth-Key') ?? '';
      return globalThis.Response.json({
        qual: { ranking: { rank: 4, matches_played: 9, sort_orders: [3.04, 100] } },
      });
    });

    expect(await client.getTeamEventStatus('2026alpha', 8033)).toEqual({
      rank: 4,
      matchesPlayed: 9,
      rankingPoints: 27,
    });
    expect(requestedUrl).toEndWith('/team/frc8033/event/2026alpha/status');
    expect(requestedKey).toBe('secret');
  });

  it('returns empty qualification status before rankings are available', async () => {
    const client = createTbaClient('secret', async () => globalThis.Response.json({ qual: null }));
    expect(await client.getTeamEventStatus('2026alpha', 8033)).toEqual({
      rank: null,
      matchesPlayed: null,
      rankingPoints: null,
    });
  });

  it('maps remapped qualification and double-elimination teams into legacy station rows', async () => {
    const client = createTbaClient('secret', async (input, init) => {
      if (input.endsWith('/matches')) {
        expect(init?.headers?.['If-None-Match']).toBe('old-etag');
        return globalThis.Response.json(
          [
            {
              key: '2026alpha_qm3',
              comp_level: 'qm',
              match_number: 3,
              alliances: {
                red: { team_keys: ['frc8033B', 'frc254', 'frc1678'] },
                blue: { team_keys: ['frc4414', 'frc5940', 'frc971'] },
              },
            },
            {
              key: '2026alpha_sf2m1',
              comp_level: 'sf',
              match_number: 1,
              alliances: {
                red: { team_keys: ['frc8033', 'frc254', 'frc1678'] },
                blue: { team_keys: ['frc4414', 'frc5940', 'frc971'] },
              },
            },
          ],
          { headers: { etag: 'new-etag' } }
        );
      }
      return globalThis.Response.json({
        playoff_type: 10,
        remap_teams: { frc8033: 'frc8033B' },
      });
    });

    const result = await client.getEventMatches('2026alpha', 'old-etag');
    expect(result.notModified).toBe(false);
    if (result.notModified) throw new Error('Expected imported matches');
    expect(result.etag).toBe('new-etag');
    expect(result.matches).toHaveLength(12);
    expect(result.matches[0]).toEqual({
      key: '2026alpha_qm3_0',
      tournamentKey: '2026alpha',
      matchNumber: 3,
      teamNumber: 8033,
      matchType: 'QUALIFICATION',
    });
    expect(result.matches[7]).toMatchObject({
      key: '2026alpha_em2_1',
      matchNumber: 2,
      teamNumber: 254,
      matchType: 'ELIMINATION',
    });
  });

  it('short-circuits a conditional match request on 304', async () => {
    const client = createTbaClient('secret', async (input) =>
      input.endsWith('/matches')
        ? new globalThis.Response(null, { status: 304 })
        : globalThis.Response.json({ playoff_type: 10, remap_teams: null })
    );
    expect(await client.getEventMatches('2026alpha', 'same')).toEqual({ notModified: true });
  });
});
