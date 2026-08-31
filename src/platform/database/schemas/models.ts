import { z } from '@hono/zod-openapi';
import {
  apiKeys,
  cachedAnalyses,
  dataFetches,
  emailVerificationRequests,
  events,
  featureToggles,
  matches,
  matchParticipants,
  matchVideos,
  mutablePicklists,
  officialAllianceBreakdowns,
  registeredTeams,
  scouters,
  scouterScheduleShifts,
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
  scoutReports,
  sharedPicklists,
  slackNotificationThreads,
  slackSubscriptions,
  slackWorkspaces,
  teamMatchData,
  teams,
  tournaments,
  users,
} from '../schema';
import {
  createDatabaseInsertSchema,
  createDatabaseSelectSchema,
  createDatabaseUpdateSchema,
  deriveModelSchemas,
} from './factory';

export const SourceRuleModeSchema = z.enum(['INCLUDE', 'EXCLUDE']).openapi('SourceRuleMode');
export const TeamSourceRuleSchema = z
  .object({
    mode: SourceRuleModeSchema,
    items: z.array(z.number().int()),
  })
  .openapi('TeamSourceRule');
export const TournamentSourceRuleSchema = z
  .object({
    mode: SourceRuleModeSchema,
    items: z.array(z.string()),
  })
  .openapi('TournamentSourceRule');

const userSelectRefinements = {
  email: z.email(),
  teamSourceRule: TeamSourceRuleSchema,
  tournamentSourceRule: TournamentSourceRuleSchema,
};
export const UserSchema = createDatabaseSelectSchema(users, userSelectRefinements).openapi('User');
export const UserInsertSchema = createDatabaseInsertSchema(users, {
  email: z.email(),
  teamSourceRule: TeamSourceRuleSchema.optional(),
  tournamentSourceRule: TournamentSourceRuleSchema.optional(),
}).openapi('UserInsert');
export const UserUpdateSchema = createDatabaseUpdateSchema(users, {
  email: z.email().optional(),
  teamSourceRule: TeamSourceRuleSchema.optional(),
  tournamentSourceRule: TournamentSourceRuleSchema.optional(),
}).openapi('UserUpdate');

const registeredTeamRefinements = { email: z.email() };
export const RegisteredTeamSchema = createDatabaseSelectSchema(
  registeredTeams,
  registeredTeamRefinements
).openapi('RegisteredTeam');
export const RegisteredTeamInsertSchema = createDatabaseInsertSchema(
  registeredTeams,
  registeredTeamRefinements
).openapi('RegisteredTeamInsert');
export const RegisteredTeamUpdateSchema = createDatabaseUpdateSchema(registeredTeams, {
  email: z.email().optional(),
}).openapi('RegisteredTeamUpdate');

const emailVerificationRequestRefinements = { email: z.email() };
export const EmailVerificationRequestSchema = createDatabaseSelectSchema(
  emailVerificationRequests,
  emailVerificationRequestRefinements
).openapi('EmailVerificationRequest');
export const EmailVerificationRequestInsertSchema = createDatabaseInsertSchema(
  emailVerificationRequests,
  emailVerificationRequestRefinements
).openapi('EmailVerificationRequestInsert');
export const EmailVerificationRequestUpdateSchema = createDatabaseUpdateSchema(
  emailVerificationRequests,
  { email: z.email().optional() }
).openapi('EmailVerificationRequestUpdate');

const ApiKeySchemas = deriveModelSchemas(apiKeys, 'ApiKey');
export const ApiKeySchema = ApiKeySchemas.select;
export const ApiKeyInsertSchema = ApiKeySchemas.insert;
export const ApiKeyUpdateSchema = ApiKeySchemas.update;

const FeatureToggleSchemas = deriveModelSchemas(featureToggles, 'FeatureToggle');
export const FeatureToggleSchema = FeatureToggleSchemas.select;
export const FeatureToggleInsertSchema = FeatureToggleSchemas.insert;
export const FeatureToggleUpdateSchema = FeatureToggleSchemas.update;

const CachedAnalysisSchemas = deriveModelSchemas(cachedAnalyses, 'CachedAnalysis');
export const CachedAnalysisSchema = CachedAnalysisSchemas.select;
export const CachedAnalysisInsertSchema = CachedAnalysisSchemas.insert;
export const CachedAnalysisUpdateSchema = CachedAnalysisSchemas.update;

const DataFetchSchemas = deriveModelSchemas(dataFetches, 'DataFetch');
export const DataFetchSchema = DataFetchSchemas.select;
export const DataFetchInsertSchema = DataFetchSchemas.insert;
export const DataFetchUpdateSchema = DataFetchSchemas.update;

const TeamSchemas = deriveModelSchemas(teams, 'Team');
export const TeamSchema = TeamSchemas.select;
export const TeamInsertSchema = TeamSchemas.insert;
export const TeamUpdateSchema = TeamSchemas.update;

const TournamentSchemas = deriveModelSchemas(tournaments, 'Tournament');
export const TournamentSchema = TournamentSchemas.select;
export const TournamentInsertSchema = TournamentSchemas.insert;
export const TournamentUpdateSchema = TournamentSchemas.update;

const TeamMatchDataSchemas = deriveModelSchemas(teamMatchData, 'TeamMatchData');
export const TeamMatchDataSchema = TeamMatchDataSchemas.select;
export const TeamMatchDataInsertSchema = TeamMatchDataSchemas.insert;
export const TeamMatchDataUpdateSchema = TeamMatchDataSchemas.update;

const MatchSchemas = deriveModelSchemas(matches, 'Match');
export const MatchSchema = MatchSchemas.select;
export const MatchInsertSchema = MatchSchemas.insert;
export const MatchUpdateSchema = MatchSchemas.update;

const MatchParticipantSchemas = deriveModelSchemas(matchParticipants, 'MatchParticipant');
export const MatchParticipantSchema = MatchParticipantSchemas.select;
export const MatchParticipantInsertSchema = MatchParticipantSchemas.insert;
export const MatchParticipantUpdateSchema = MatchParticipantSchemas.update;

const OfficialAllianceBreakdownSchemas = deriveModelSchemas(
  officialAllianceBreakdowns,
  'OfficialAllianceBreakdown'
);
export const OfficialAllianceBreakdownSchema = OfficialAllianceBreakdownSchemas.select;
export const OfficialAllianceBreakdownInsertSchema = OfficialAllianceBreakdownSchemas.insert;
export const OfficialAllianceBreakdownUpdateSchema = OfficialAllianceBreakdownSchemas.update;

const MatchVideoSchemas = deriveModelSchemas(matchVideos, 'MatchVideo');
export const MatchVideoSchema = MatchVideoSchemas.select;
export const MatchVideoInsertSchema = MatchVideoSchemas.insert;
export const MatchVideoUpdateSchema = MatchVideoSchemas.update;

const ScouterSchemas = deriveModelSchemas(scouters, 'Scouter');
export const ScouterSchema = ScouterSchemas.select;
export const ScouterInsertSchema = ScouterSchemas.insert;
export const ScouterUpdateSchema = ScouterSchemas.update;

const ScouterScheduleShiftSchemas = deriveModelSchemas(
  scouterScheduleShifts,
  'ScouterScheduleShift'
);
export const ScouterScheduleShiftSchema = ScouterScheduleShiftSchemas.select;
export const ScouterScheduleShiftInsertSchema = ScouterScheduleShiftSchemas.insert;
export const ScouterScheduleShiftUpdateSchema = ScouterScheduleShiftSchemas.update;

const ScoutReportSchemas = deriveModelSchemas(scoutReports, 'ScoutReport');
export const ScoutReportSchema = ScoutReportSchemas.select;
export const ScoutReportInsertSchema = ScoutReportSchemas.insert;
export const ScoutReportUpdateSchema = ScoutReportSchemas.update;

const EventSchemas = deriveModelSchemas(events, 'Event');
export const EventSchema = EventSchemas.select;
export const EventInsertSchema = EventSchemas.insert;
export const EventUpdateSchema = EventSchemas.update;

const MutablePicklistSchemas = deriveModelSchemas(mutablePicklists, 'MutablePicklist');
export const MutablePicklistSchema = MutablePicklistSchemas.select;
export const MutablePicklistInsertSchema = MutablePicklistSchemas.insert;
export const MutablePicklistUpdateSchema = MutablePicklistSchemas.update;

const SharedPicklistSchemas = deriveModelSchemas(sharedPicklists, 'SharedPicklist');
export const SharedPicklistSchema = SharedPicklistSchemas.select;
export const SharedPicklistInsertSchema = SharedPicklistSchemas.insert;
export const SharedPicklistUpdateSchema = SharedPicklistSchemas.update;

const SlackWorkspaceSchemas = deriveModelSchemas(slackWorkspaces, 'SlackWorkspace');
export const SlackWorkspaceSchema = SlackWorkspaceSchemas.select;
export const SlackWorkspaceInsertSchema = SlackWorkspaceSchemas.insert;
export const SlackWorkspaceUpdateSchema = SlackWorkspaceSchemas.update;

const SlackSubscriptionSchemas = deriveModelSchemas(slackSubscriptions, 'SlackSubscription');
export const SlackSubscriptionSchema = SlackSubscriptionSchemas.select;
export const SlackSubscriptionInsertSchema = SlackSubscriptionSchemas.insert;
export const SlackSubscriptionUpdateSchema = SlackSubscriptionSchemas.update;

const SlackNotificationThreadSchemas = deriveModelSchemas(
  slackNotificationThreads,
  'SlackNotificationThread'
);
export const SlackNotificationThreadSchema = SlackNotificationThreadSchemas.select;
export const SlackNotificationThreadInsertSchema = SlackNotificationThreadSchemas.insert;
export const SlackNotificationThreadUpdateSchema = SlackNotificationThreadSchemas.update;

function deriveAssignmentSchemas(
  table: typeof scouterScheduleShiftTeam1,
  positionNumber: 1 | 2 | 3 | 4 | 5 | 6
) {
  return deriveModelSchemas(table, `ScouterScheduleShiftTeam${positionNumber}`);
}

const Team1AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam1, 1);
export const ScouterScheduleShiftTeam1Schema = Team1AssignmentSchemas.select;
export const ScouterScheduleShiftTeam1InsertSchema = Team1AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam1UpdateSchema = Team1AssignmentSchemas.update;

const Team2AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam2, 2);
export const ScouterScheduleShiftTeam2Schema = Team2AssignmentSchemas.select;
export const ScouterScheduleShiftTeam2InsertSchema = Team2AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam2UpdateSchema = Team2AssignmentSchemas.update;

const Team3AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam3, 3);
export const ScouterScheduleShiftTeam3Schema = Team3AssignmentSchemas.select;
export const ScouterScheduleShiftTeam3InsertSchema = Team3AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam3UpdateSchema = Team3AssignmentSchemas.update;

const Team4AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam4, 4);
export const ScouterScheduleShiftTeam4Schema = Team4AssignmentSchemas.select;
export const ScouterScheduleShiftTeam4InsertSchema = Team4AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam4UpdateSchema = Team4AssignmentSchemas.update;

const Team5AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam5, 5);
export const ScouterScheduleShiftTeam5Schema = Team5AssignmentSchemas.select;
export const ScouterScheduleShiftTeam5InsertSchema = Team5AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam5UpdateSchema = Team5AssignmentSchemas.update;

const Team6AssignmentSchemas = deriveAssignmentSchemas(scouterScheduleShiftTeam6, 6);
export const ScouterScheduleShiftTeam6Schema = Team6AssignmentSchemas.select;
export const ScouterScheduleShiftTeam6InsertSchema = Team6AssignmentSchemas.insert;
export const ScouterScheduleShiftTeam6UpdateSchema = Team6AssignmentSchemas.update;

export type User = z.infer<typeof UserSchema>;
export type UserInsert = z.infer<typeof UserInsertSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type RegisteredTeam = z.infer<typeof RegisteredTeamSchema>;
export type RegisteredTeamInsert = z.infer<typeof RegisteredTeamInsertSchema>;
export type RegisteredTeamUpdate = z.infer<typeof RegisteredTeamUpdateSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type ApiKeyInsert = z.infer<typeof ApiKeyInsertSchema>;
export type ApiKeyUpdate = z.infer<typeof ApiKeyUpdateSchema>;
export type FeatureToggle = z.infer<typeof FeatureToggleSchema>;
export type FeatureToggleInsert = z.infer<typeof FeatureToggleInsertSchema>;
export type FeatureToggleUpdate = z.infer<typeof FeatureToggleUpdateSchema>;
export type CachedAnalysis = z.infer<typeof CachedAnalysisSchema>;
export type CachedAnalysisInsert = z.infer<typeof CachedAnalysisInsertSchema>;
export type CachedAnalysisUpdate = z.infer<typeof CachedAnalysisUpdateSchema>;
export type DataFetch = z.infer<typeof DataFetchSchema>;
export type DataFetchInsert = z.infer<typeof DataFetchInsertSchema>;
export type DataFetchUpdate = z.infer<typeof DataFetchUpdateSchema>;
export type Team = z.infer<typeof TeamSchema>;
export type TeamInsert = z.infer<typeof TeamInsertSchema>;
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>;
export type Tournament = z.infer<typeof TournamentSchema>;
export type TournamentInsert = z.infer<typeof TournamentInsertSchema>;
export type TournamentUpdate = z.infer<typeof TournamentUpdateSchema>;
export type TeamMatchData = z.infer<typeof TeamMatchDataSchema>;
export type TeamMatchDataInsert = z.infer<typeof TeamMatchDataInsertSchema>;
export type TeamMatchDataUpdate = z.infer<typeof TeamMatchDataUpdateSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type MatchInsert = z.infer<typeof MatchInsertSchema>;
export type MatchUpdate = z.infer<typeof MatchUpdateSchema>;
export type MatchParticipant = z.infer<typeof MatchParticipantSchema>;
export type MatchParticipantInsert = z.infer<typeof MatchParticipantInsertSchema>;
export type MatchParticipantUpdate = z.infer<typeof MatchParticipantUpdateSchema>;
export type OfficialAllianceBreakdown = z.infer<typeof OfficialAllianceBreakdownSchema>;
export type OfficialAllianceBreakdownInsert = z.infer<typeof OfficialAllianceBreakdownInsertSchema>;
export type OfficialAllianceBreakdownUpdate = z.infer<typeof OfficialAllianceBreakdownUpdateSchema>;
export type MatchVideo = z.infer<typeof MatchVideoSchema>;
export type MatchVideoInsert = z.infer<typeof MatchVideoInsertSchema>;
export type MatchVideoUpdate = z.infer<typeof MatchVideoUpdateSchema>;
export type Scouter = z.infer<typeof ScouterSchema>;
export type ScouterInsert = z.infer<typeof ScouterInsertSchema>;
export type ScouterUpdate = z.infer<typeof ScouterUpdateSchema>;
export type ScouterScheduleShift = z.infer<typeof ScouterScheduleShiftSchema>;
export type ScouterScheduleShiftInsert = z.infer<typeof ScouterScheduleShiftInsertSchema>;
export type ScouterScheduleShiftUpdate = z.infer<typeof ScouterScheduleShiftUpdateSchema>;
export type ScoutReport = z.infer<typeof ScoutReportSchema>;
export type ScoutReportInsert = z.infer<typeof ScoutReportInsertSchema>;
export type ScoutReportUpdate = z.infer<typeof ScoutReportUpdateSchema>;
export type Event = z.infer<typeof EventSchema>;
export type EventInsert = z.infer<typeof EventInsertSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type MutablePicklist = z.infer<typeof MutablePicklistSchema>;
export type MutablePicklistInsert = z.infer<typeof MutablePicklistInsertSchema>;
export type MutablePicklistUpdate = z.infer<typeof MutablePicklistUpdateSchema>;
export type SharedPicklist = z.infer<typeof SharedPicklistSchema>;
export type SharedPicklistInsert = z.infer<typeof SharedPicklistInsertSchema>;
export type SharedPicklistUpdate = z.infer<typeof SharedPicklistUpdateSchema>;
export type SlackWorkspace = z.infer<typeof SlackWorkspaceSchema>;
export type SlackWorkspaceInsert = z.infer<typeof SlackWorkspaceInsertSchema>;
export type SlackWorkspaceUpdate = z.infer<typeof SlackWorkspaceUpdateSchema>;
export type SlackSubscription = z.infer<typeof SlackSubscriptionSchema>;
export type SlackSubscriptionInsert = z.infer<typeof SlackSubscriptionInsertSchema>;
export type SlackSubscriptionUpdate = z.infer<typeof SlackSubscriptionUpdateSchema>;
export type SlackNotificationThread = z.infer<typeof SlackNotificationThreadSchema>;
export type SlackNotificationThreadInsert = z.infer<typeof SlackNotificationThreadInsertSchema>;
export type SlackNotificationThreadUpdate = z.infer<typeof SlackNotificationThreadUpdateSchema>;
export type EmailVerificationRequest = z.infer<typeof EmailVerificationRequestSchema>;
export type EmailVerificationRequestInsert = z.infer<typeof EmailVerificationRequestInsertSchema>;
export type EmailVerificationRequestUpdate = z.infer<typeof EmailVerificationRequestUpdateSchema>;
