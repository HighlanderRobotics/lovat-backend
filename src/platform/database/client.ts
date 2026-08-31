import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Environment } from '../config/environment';
import * as schema from './schema';

export function createDatabase(environment: Environment) {
  const pool = new pg.Pool({
    connectionString: environment.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 30_000,
  });

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
