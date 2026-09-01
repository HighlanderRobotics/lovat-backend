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
});
