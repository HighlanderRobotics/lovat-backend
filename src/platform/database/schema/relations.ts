import { relations } from 'drizzle-orm';
import { apiKeys, users } from './accounts';
import {
  matches,
  matchParticipants,
  matchVideos,
  officialAllianceBreakdowns,
  teamMatchData,
  tournaments,
} from './competition';
import { slackNotificationThreads, slackSubscriptions, slackWorkspaces } from './notifications';
import { mutablePicklists, sharedPicklists } from './picklists';
import {
  events,
  scouterScheduleShifts,
  scouterScheduleShiftTeam1,
  scouterScheduleShiftTeam2,
  scouterScheduleShiftTeam3,
  scouterScheduleShiftTeam4,
  scouterScheduleShiftTeam5,
  scouterScheduleShiftTeam6,
  scouters,
  scoutReports,
} from './scouting';
import { registeredTeams, teams } from './teams';

export const teamsRelations = relations(teams, ({ one }) => ({
  registeredTeam: one(registeredTeams),
}));

export const registeredTeamsRelations = relations(registeredTeams, ({ many, one }) => ({
  team: one(teams, {
    fields: [registeredTeams.number],
    references: [teams.number],
  }),
  users: many(users),
  scouters: many(scouters),
  scouterScheduleShifts: many(scouterScheduleShifts),
  slackWorkspaces: many(slackWorkspaces),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  team: one(registeredTeams, {
    fields: [users.teamNumber],
    references: [registeredTeams.number],
  }),
  apiKeys: many(apiKeys),
  mutablePicklists: many(mutablePicklists),
  sharedPicklists: many(sharedPicklists),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  matches: many(matches),
  teamMatchData: many(teamMatchData),
  mutablePicklists: many(mutablePicklists),
  scouterScheduleShifts: many(scouterScheduleShifts),
}));

export const matchesRelations = relations(matches, ({ many, one }) => ({
  tournament: one(tournaments, {
    fields: [matches.tournamentKey],
    references: [tournaments.key],
  }),
  participants: many(matchParticipants),
  breakdowns: many(officialAllianceBreakdowns),
  videos: many(matchVideos),
}));

export const matchParticipantsRelations = relations(matchParticipants, ({ one }) => ({
  match: one(matches, {
    fields: [matchParticipants.matchKey],
    references: [matches.key],
  }),
  teamMatchData: one(teamMatchData, {
    fields: [matchParticipants.teamMatchKey],
    references: [teamMatchData.key],
  }),
}));

export const officialAllianceBreakdownsRelations = relations(
  officialAllianceBreakdowns,
  ({ one }) => ({
    match: one(matches, {
      fields: [officialAllianceBreakdowns.matchKey],
      references: [matches.key],
    }),
  })
);

export const matchVideosRelations = relations(matchVideos, ({ one }) => ({
  match: one(matches, {
    fields: [matchVideos.matchKey],
    references: [matches.key],
  }),
}));

export const teamMatchDataRelations = relations(teamMatchData, ({ many, one }) => ({
  tournament: one(tournaments, {
    fields: [teamMatchData.tournamentKey],
    references: [tournaments.key],
  }),
  scoutReports: many(scoutReports),
  matchParticipant: one(matchParticipants),
}));

export const scoutersRelations = relations(scouters, ({ many, one }) => ({
  sourceTeam: one(registeredTeams, {
    fields: [scouters.sourceTeamNumber],
    references: [registeredTeams.number],
  }),
  scoutReports: many(scoutReports),
  team1Assignments: many(scouterScheduleShiftTeam1),
  team2Assignments: many(scouterScheduleShiftTeam2),
  team3Assignments: many(scouterScheduleShiftTeam3),
  team4Assignments: many(scouterScheduleShiftTeam4),
  team5Assignments: many(scouterScheduleShiftTeam5),
  team6Assignments: many(scouterScheduleShiftTeam6),
}));

export const scouterScheduleShiftsRelations = relations(scouterScheduleShifts, ({ many, one }) => ({
  sourceTeam: one(registeredTeams, {
    fields: [scouterScheduleShifts.sourceTeamNumber],
    references: [registeredTeams.number],
  }),
  tournament: one(tournaments, {
    fields: [scouterScheduleShifts.tournamentKey],
    references: [tournaments.key],
  }),
  team1Assignments: many(scouterScheduleShiftTeam1),
  team2Assignments: many(scouterScheduleShiftTeam2),
  team3Assignments: many(scouterScheduleShiftTeam3),
  team4Assignments: many(scouterScheduleShiftTeam4),
  team5Assignments: many(scouterScheduleShiftTeam5),
  team6Assignments: many(scouterScheduleShiftTeam6),
}));

export const scoutReportsRelations = relations(scoutReports, ({ many, one }) => ({
  events: many(events),
  scouter: one(scouters, {
    fields: [scoutReports.scouterUuid],
    references: [scouters.uuid],
  }),
  teamMatchData: one(teamMatchData, {
    fields: [scoutReports.teamMatchKey],
    references: [teamMatchData.key],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  scoutReport: one(scoutReports, {
    fields: [events.scoutReportUuid],
    references: [scoutReports.uuid],
  }),
}));

function assignmentRelations(
  assignment: typeof scouterScheduleShiftTeam1,
  scouterRelationName: string,
  shiftRelationName: string
) {
  return relations(assignment, ({ one }) => ({
    scouter: one(scouters, {
      fields: [assignment.A],
      references: [scouters.uuid],
      relationName: scouterRelationName,
    }),
    shift: one(scouterScheduleShifts, {
      fields: [assignment.B],
      references: [scouterScheduleShifts.uuid],
      relationName: shiftRelationName,
    }),
  }));
}

export const scouterScheduleShiftTeam1Relations = assignmentRelations(
  scouterScheduleShiftTeam1,
  'Team1Scouter',
  'Team1Shift'
);
export const scouterScheduleShiftTeam2Relations = assignmentRelations(
  scouterScheduleShiftTeam2,
  'Team2Scouter',
  'Team2Shift'
);
export const scouterScheduleShiftTeam3Relations = assignmentRelations(
  scouterScheduleShiftTeam3,
  'Team3Scouter',
  'Team3Shift'
);
export const scouterScheduleShiftTeam4Relations = assignmentRelations(
  scouterScheduleShiftTeam4,
  'Team4Scouter',
  'Team4Shift'
);
export const scouterScheduleShiftTeam5Relations = assignmentRelations(
  scouterScheduleShiftTeam5,
  'Team5Scouter',
  'Team5Shift'
);
export const scouterScheduleShiftTeam6Relations = assignmentRelations(
  scouterScheduleShiftTeam6,
  'Team6Scouter',
  'Team6Shift'
);

export const mutablePicklistsRelations = relations(mutablePicklists, ({ one }) => ({
  author: one(users, {
    fields: [mutablePicklists.authorId],
    references: [users.id],
  }),
  tournament: one(tournaments, {
    fields: [mutablePicklists.tournamentKey],
    references: [tournaments.key],
  }),
}));

export const sharedPicklistsRelations = relations(sharedPicklists, ({ one }) => ({
  author: one(users, {
    fields: [sharedPicklists.authorId],
    references: [users.id],
  }),
}));

export const slackWorkspacesRelations = relations(slackWorkspaces, ({ many, one }) => ({
  team: one(registeredTeams, {
    fields: [slackWorkspaces.owner],
    references: [registeredTeams.number],
  }),
  subscriptions: many(slackSubscriptions),
}));

export const slackSubscriptionsRelations = relations(slackSubscriptions, ({ many, one }) => ({
  workspace: one(slackWorkspaces, {
    fields: [slackSubscriptions.workspaceId],
    references: [slackWorkspaces.workspaceId],
  }),
  notificationRecords: many(slackNotificationThreads),
}));

export const slackNotificationThreadsRelations = relations(slackNotificationThreads, ({ one }) => ({
  channel: one(slackSubscriptions, {
    fields: [slackNotificationThreads.subscriptionId],
    references: [slackSubscriptions.subscriptionId],
  }),
}));
