CREATE TYPE "public"."AlgaePickup" AS ENUM('NONE', 'GROUND', 'REEF', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."AutoLeave" AS ENUM('NO', 'YES');--> statement-breakpoint
CREATE TYPE "public"."BargeResult" AS ENUM('NOT_ATTEMPTED', 'PARKED', 'SHALLOW', 'FAILED_SHALLOW', 'DEEP', 'FAILED_DEEP');--> statement-breakpoint
CREATE TYPE "public"."CoralPickup" AS ENUM('NONE', 'GROUND', 'STATION', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."EventAction" AS ENUM('PICKUP_CORAL', 'PICKUP_ALGAE', 'FEED', 'AUTO_LEAVE', 'DEFEND', 'SCORE_NET', 'FAIL_NET', 'SCORE_PROCESSOR', 'SCORE_CORAL', 'DROP_ALGAE', 'DROP_CORAL', 'START_POSITION');--> statement-breakpoint
CREATE TYPE "public"."KnocksAlgae" AS ENUM('NO', 'YES');--> statement-breakpoint
CREATE TYPE "public"."MatchType" AS ENUM('QUALIFICATION', 'ELIMINATION');--> statement-breakpoint
CREATE TYPE "public"."Position" AS ENUM('NONE', 'START_ONE', 'START_TWO', 'START_THREE', 'START_FOUR', 'LEVEL_ONE', 'LEVEL_TWO', 'LEVEL_THREE', 'LEVEL_FOUR', 'LEVEL_ONE_A', 'LEVEL_ONE_B', 'LEVEL_ONE_C', 'LEVEL_TWO_A', 'LEVEL_TWO_B', 'LEVEL_TWO_C', 'LEVEL_THREE_A', 'LEVEL_THREE_B', 'LEVEL_THREE_C', 'LEVEL_FOUR_A', 'LEVEL_FOUR_B', 'LEVEL_FOUR_C', 'GROUND_PIECE_A', 'GROUND_PIECE_B', 'GROUND_PIECE_C', 'CORAL_STATION_ONE', 'CORAL_STATION_TWO');--> statement-breakpoint
CREATE TYPE "public"."RobotRole" AS ENUM('OFFENSE', 'DEFENSE', 'FEEDER', 'IMMOBILE');--> statement-breakpoint
CREATE TYPE "public"."UnderShallowCage" AS ENUM('NO', 'YES');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('MEMBER', 'ADMIN', 'OWNER');--> statement-breakpoint
CREATE TYPE "public"."WarningType" AS ENUM('AUTO_LEAVE', 'BREAK');--> statement-breakpoint
CREATE TABLE "ApiKey" (
	"uuid" varchar PRIMARY KEY NOT NULL,
	"keyHash" varchar NOT NULL,
	"name" varchar NOT NULL,
	"userId" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastUsed" timestamp,
	"requests" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ApiKey_keyHash_unique" UNIQUE("keyHash")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" varchar PRIMARY KEY NOT NULL,
	"teamNumber" integer,
	"email" varchar NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"username" varchar,
	"role" "UserRole" DEFAULT 'MEMBER' NOT NULL,
	"tournamentSourceRule" jsonb DEFAULT '{"mode":"EXCLUDE","items":[]}' NOT NULL,
	"teamSourceRule" jsonb DEFAULT '{"mode":"EXCLUDE","items":[]}' NOT NULL,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "RegisteredTeam" (
	"number" integer PRIMARY KEY NOT NULL,
	"code" varchar NOT NULL,
	"email" varchar NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"teamApproved" boolean DEFAULT false NOT NULL,
	"website" varchar,
	CONSTRAINT "RegisteredTeam_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "Team" (
	"number" integer PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TeamMatchData" (
	"key" varchar PRIMARY KEY NOT NULL,
	"tournamentKey" varchar NOT NULL,
	"matchNumber" integer NOT NULL,
	"teamNumber" integer NOT NULL,
	"matchType" "MatchType" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tournament" (
	"key" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"location" varchar,
	"date" varchar
);
--> statement-breakpoint
CREATE TABLE "Event" (
	"eventUuid" varchar PRIMARY KEY NOT NULL,
	"time" integer NOT NULL,
	"action" "EventAction" NOT NULL,
	"position" "Position" NOT NULL,
	"points" integer NOT NULL,
	"scoutReportUuid" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScoutReport" (
	"uuid" varchar PRIMARY KEY NOT NULL,
	"teamMatchKey" varchar NOT NULL,
	"startTime" timestamp NOT NULL,
	"notes" varchar NOT NULL,
	"robotRole" "RobotRole" NOT NULL,
	"algaePickup" "AlgaePickup" NOT NULL,
	"coralPickup" "CoralPickup" NOT NULL,
	"bargeResult" "BargeResult" NOT NULL,
	"knocksAlgae" "KnocksAlgae" NOT NULL,
	"underShallowCage" "UnderShallowCage" NOT NULL,
	"robotBrokeDescription" varchar,
	"driverAbility" integer NOT NULL,
	"scouterUuid" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ScouterScheduleShift" (
	"uuid" varchar PRIMARY KEY NOT NULL,
	"sourceTeamNumber" integer NOT NULL,
	"tournamentKey" varchar NOT NULL,
	"startMatchOrdinalNumber" integer NOT NULL,
	"endMatchOrdinalNumber" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Scouter" (
	"uuid" varchar PRIMARY KEY NOT NULL,
	"name" varchar,
	"archived" boolean DEFAULT false NOT NULL,
	"sourceTeamNumber" integer NOT NULL,
	"strikes" integer DEFAULT 0 NOT NULL,
	"scouterReliability" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SlackNotificationThread" (
	"messageId" varchar PRIMARY KEY NOT NULL,
	"matchNumber" integer NOT NULL,
	"teamNumber" integer NOT NULL,
	"subscriptionId" varchar NOT NULL,
	"channelId" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SlackSubscription" (
	"subscriptionId" varchar PRIMARY KEY NOT NULL,
	"channelId" varchar NOT NULL,
	"workspaceId" varchar NOT NULL,
	"subscribedEvent" "WarningType" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SlackWorkspace" (
	"workspaceId" varchar PRIMARY KEY NOT NULL,
	"owner" integer NOT NULL,
	"name" varchar NOT NULL,
	"authToken" varchar NOT NULL,
	"botUserId" varchar NOT NULL,
	"authUserId" varchar NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RegisteredTeam" ADD CONSTRAINT "RegisteredTeam_number_Team_number_fk" FOREIGN KEY ("number") REFERENCES "public"."Team"("number") ON DELETE no action ON UPDATE no action;