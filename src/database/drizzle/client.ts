import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
let pool: pg.Pool;
if (
  !process.env.PGHOST ||
  !process.env.PGPORT ||
  !process.env.PGUSER ||
  !process.env.PGPASSWORD ||
  !process.env.PGDATABASE
) {
  pool = new pg.Pool({
    max: 5,
    idleTimeoutMillis: 30_000,
  });
} else {
  pool = new pg.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export const db = drizzle(pool);
