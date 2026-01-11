import type { Context } from 'hono';
import type { users } from './../database/drizzle/schema'; // or your Drizzle User type

export interface AuthenticatedRequestContext extends Context {
  user: typeof users.$inferSelect;
  tokenType: 'jwt' | 'apiKey';
}
