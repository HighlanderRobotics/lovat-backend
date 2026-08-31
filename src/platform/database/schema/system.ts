import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const featureToggles = pgTable('FeatureToggle', {
  feature: text('feature').primaryKey(),
  enabled: boolean('enabled').notNull().default(true),
});

export const cachedAnalyses = pgTable('CachedAnalysis', {
  key: text('key').primaryKey(),
  teamDependencies: integer('teamDependencies').array().notNull().default([]),
  tournamentDependencies: text('tournamentDependencies').array().notNull().default([]),
});

export const dataFetches = pgTable('DataFetch', {
  key: text('key').primaryKey(),
  etag: text('etag'),
  createdAt: timestamp('createdAt', { mode: 'date', precision: 3 }).notNull().defaultNow(),
  lastTried: timestamp('lastTried', { mode: 'date', precision: 3 }),
  lastFetched: timestamp('lastFetched', { mode: 'date', precision: 3 }),
  data: text('data'),
});
