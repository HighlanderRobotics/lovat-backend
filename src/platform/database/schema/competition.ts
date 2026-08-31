import { randomUUID } from 'node:crypto';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { allianceColor, matchType } from './enums';

export const tournaments = pgTable('Tournament', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  location: text('location'),
  date: text('date'),
  latestFetchETag: text('latestFetchETag'),
});

export const teamMatchData = pgTable(
  'TeamMatchData',
  {
    key: text('key').primaryKey(),
    tournamentKey: text('tournamentKey')
      .notNull()
      .references(() => tournaments.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
    matchNumber: smallint('matchNumber').notNull(),
    teamNumber: integer('teamNumber').notNull(),
    matchType: matchType('matchType').notNull(),
  },
  (table) => [
    index('TeamMatchData_tournamentKey_teamNumber_idx').on(table.tournamentKey, table.teamNumber),
  ]
);

export const matches = pgTable(
  'Match',
  {
    key: text('key').primaryKey(),
    tournamentKey: text('tournamentKey')
      .notNull()
      .references(() => tournaments.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
    year: integer('year').notNull(),
    compLevel: text('compLevel').notNull(),
    setNumber: integer('setNumber').notNull(),
    matchNumber: integer('matchNumber').notNull(),
    scheduledTime: timestamp('scheduledTime', { mode: 'date', precision: 3 }),
    actualTime: timestamp('actualTime', { mode: 'date', precision: 3 }),
    redScore: integer('redScore'),
    blueScore: integer('blueScore'),
    rawTba: jsonb('rawTba').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('Match_tournamentKey_compLevel_matchNumber_idx').on(
      table.tournamentKey,
      table.compLevel,
      table.matchNumber
    ),
  ]
);

export const matchParticipants = pgTable(
  'MatchParticipant',
  {
    matchKey: text('matchKey')
      .notNull()
      .references(() => matches.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
    teamNumber: integer('teamNumber').notNull(),
    alliance: allianceColor('alliance').notNull(),
    station: integer('station').notNull(),
    teamMatchKey: text('teamMatchKey').references(() => teamMatchData.key, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
  },
  (table) => [
    primaryKey({ columns: [table.matchKey, table.teamNumber] }),
    unique('MatchParticipant_teamMatchKey_key').on(table.teamMatchKey),
    index('MatchParticipant_teamNumber_idx').on(table.teamNumber),
  ]
);

export const officialAllianceBreakdowns = pgTable(
  'OfficialAllianceBreakdown',
  {
    matchKey: text('matchKey')
      .notNull()
      .references(() => matches.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
    alliance: allianceColor('alliance').notNull(),
    isConsistent: boolean('isConsistent'),
    raw: jsonb('raw').notNull(),
    fetchedAt: timestamp('fetchedAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { mode: 'date', precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.matchKey, table.alliance] })]
);

export const matchVideos = pgTable(
  'MatchVideo',
  {
    uuid: text('uuid')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    matchKey: text('matchKey')
      .notNull()
      .references(() => matches.key, { onDelete: 'cascade', onUpdate: 'cascade' }),
    type: text('type').notNull(),
    externalKey: text('externalKey').notNull(),
    createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  },
  (table) => [
    unique('MatchVideo_matchKey_type_externalKey_key').on(
      table.matchKey,
      table.type,
      table.externalKey
    ),
    index('MatchVideo_matchKey_idx').on(table.matchKey),
  ]
);
