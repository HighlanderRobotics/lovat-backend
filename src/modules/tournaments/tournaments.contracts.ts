import { z } from '@hono/zod-openapi';
import {
  ScoutReportSchema,
  TeamMatchDataSchema,
  TeamSchema,
  TournamentSchema,
} from '../../platform/database/schemas';

export const TournamentSummarySchema = TournamentSchema.extend({
  isParticipant: z.boolean(),
}).openapi('TournamentSummary');

export const TournamentListQuerySchema = z
  .object({
    filter: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .openapi('TournamentListQuery');

export const TournamentListResponseSchema = z
  .object({
    tournaments: z.array(TournamentSummarySchema),
    count: z.number().int().min(0),
  })
  .openapi('TournamentListResponse');

export const TournamentPathSchema = TournamentSchema.pick({ key: true })
  .extend({ key: z.string().trim().min(1).max(50) })
  .openapi('TournamentPath');

export const MatchCatalogQuerySchema = z.object({ teams: z.string().optional() });
export const MatchCheckQuerySchema = z.object({
  tournamentKey: z.string().min(1),
  teamNumber: z.coerce.number().int().positive(),
  matchNumber: z.coerce.number().int().positive(),
  isElim: z.enum(['true', 'false']).transform((value) => value === 'true'),
});
export const MatchTeamSchema = z.object({
  number: z.number().int().positive(),
  scouters: z.array(z.object({ name: z.string().nullable(), scouted: z.boolean() })),
  externalReports: z.number().int().nonnegative(),
});
export const MatchCatalogItemSchema = z
  .object({
    matchNumber: z.number().int().positive(),
    matchType: z.union([z.literal(0), z.literal(1)]),
    scouted: z.boolean(),
    finished: z.boolean(),
    team1: MatchTeamSchema,
    team2: MatchTeamSchema,
    team3: MatchTeamSchema,
    team4: MatchTeamSchema,
    team5: MatchTeamSchema,
    team6: MatchTeamSchema,
  })
  .openapi('TournamentMatch');
export const MatchCatalogSchema = z.array(MatchCatalogItemSchema).openapi('TournamentMatchList');
export const MatchCheckResponseSchema = z
  .object({ match: TeamMatchDataSchema, alliance: z.enum(['red', 'blue']) })
  .openapi('MatchCheckResponse');
export const TeamTournamentStatusQuerySchema = z.object({
  teamNumber: z.coerce.number().int().positive(),
});
export const TeamTournamentStatusSchema = z
  .object({
    number: z.number().int().positive(),
    name: z.string(),
    rank: z.number().int().positive().nullable(),
    rankingPoints: z.number().int().nullable(),
    matchesPlayed: z.number().int().nonnegative().nullable(),
    matchesTotal: z.number().int().nonnegative(),
  })
  .openapi('TeamTournamentStatus');
export const MatchResultsQuerySchema = z.object({ matchKey: z.string().trim().min(1).max(100) });
const MatchResultTeamSchema = z.object({
  teamNumber: z.number().int().positive(),
  pointsScored: z.number(),
  reports: z.array(ScoutReportSchema),
  role: z.array(z.number().int().nonnegative()).length(6),
});
const AllianceResultsSchema = z.object({
  teams: z.array(MatchResultTeamSchema).length(3),
  totalPoints: z.number(),
  totalDefenseTime: z.number(),
  totalFuelOutputted: z.number(),
  autoPoints: z.number(),
  teleopPoints: z.number(),
});
export const MatchResultsSchema = z
  .object({ red: AllianceResultsSchema, blue: AllianceResultsSchema })
  .openapi('MatchResults');

export const TeamCodeScheduleHeaderSchema = z.object({
  'x-team-code': z.string().min(1).max(200),
});
export const PublicScouterScheduleSchema = z
  .object({
    hash: z.string(),
    data: z.array(
      z.object({
        matchType: z.union([z.literal(0), z.literal(1)]),
        matchNumber: z.number().int().positive(),
        scouters: z.record(
          z.string(),
          z.object({ team: z.number().int().positive(), alliance: z.enum(['red', 'blue']) })
        ),
      })
    ),
  })
  .openapi('PublicScouterSchedule');
export const PublicScheduledTournamentsSchema = z
  .object({ tournaments: z.array(TournamentSchema) })
  .openapi('PublicScheduledTournaments');

export const TournamentTeamsResponseSchema = z
  .object({ teams: z.array(TeamSchema) })
  .openapi('TournamentTeamsResponse');

const AssignedScouterSchema = z.object({ uuid: z.uuid(), name: z.string().nullable() });
export const ScouterShiftSchema = z
  .object({
    uuid: z.uuid(),
    startMatchOrdinalNumber: z.number().int().positive(),
    endMatchOrdinalNumber: z.number().int().positive(),
    team1: z.array(AssignedScouterSchema),
    team2: z.array(AssignedScouterSchema),
    team3: z.array(AssignedScouterSchema),
    team4: z.array(AssignedScouterSchema),
    team5: z.array(AssignedScouterSchema),
    team6: z.array(AssignedScouterSchema),
  })
  .openapi('ScouterShift');

export const ScouterScheduleResponseSchema = z
  .object({ hash: z.string(), data: z.array(ScouterShiftSchema) })
  .openapi('ScouterScheduleResponse');

const AssignmentIdsSchema = z.array(z.uuid()).max(50);
export const ScouterShiftWriteSchema = z
  .object({
    startMatchOrdinalNumber: z.number().int().positive(),
    endMatchOrdinalNumber: z.number().int().positive(),
    team1: AssignmentIdsSchema,
    team2: AssignmentIdsSchema,
    team3: AssignmentIdsSchema,
    team4: AssignmentIdsSchema,
    team5: AssignmentIdsSchema,
    team6: AssignmentIdsSchema,
  })
  .refine((value) => value.endMatchOrdinalNumber >= value.startMatchOrdinalNumber, {
    message: 'Shift end must not precede its start',
  })
  .openapi('ScouterShiftWrite');
export const ScouterShiftPathSchema = TournamentPathSchema.extend({
  uuid: z.uuid(),
}).openapi('ScouterShiftPath');
export const ScouterShiftCreatedSchema = z
  .object({ uuid: z.uuid() })
  .openapi('ScouterShiftCreated');
