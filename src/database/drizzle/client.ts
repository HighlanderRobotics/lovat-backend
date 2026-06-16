import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../drizzle/schema/index';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
});

export const db = drizzle(pool, { schema });
