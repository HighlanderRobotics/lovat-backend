import { z } from '@hono/zod-openapi';
import { MatchType } from './enums';

export const TournamentSchema = z
  .object({
    key: z.string().openapi({ example: '2024cafr' }),
    name: z.string().openapi({ example: 'Chezy Champs' }),
    location: z.string().nullable().openapi({ example: 'San Jose, CA' }),
    date: z.string().nullable().openapi({ example: '2024-10-01' }),
  })
  .openapi('Tournament');

export const TeamMatchDataSchema = z
  .object({
    key: z.string().openapi({ example: '2024cafr_qm24_8033' }),
    tournamentKey: z.string().openapi({ example: '2024cafr' }),
    matchNumber: z.number().int().openapi({ example: 24 }),
    teamNumber: z.number().int().openapi({ example: 8033 }),
    matchType: MatchType.openapi({ example: 'QUALIFICATION' }),
  })
  .openapi('TeamMatchData');

export type Tournament = z.infer<typeof TournamentSchema>;
export type TeamMatchData = z.infer<typeof TeamMatchDataSchema>;
