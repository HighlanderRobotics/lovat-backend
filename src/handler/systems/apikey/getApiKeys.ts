import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../../../database/drizzle/client';
import { apiKeys, users } from '../../../database/drizzle/schema';
import z from 'zod';

export const getApiKeysResponseSchema = z.object({
  apiKeys: z.array(
    z.object({
      uuid: z.string(),
      keyHash: z.string(),
      userId: z.string(),
      createdAt: z.date(),
    })
  ),
});

export const getApiKeys = async (c: Context) => {
  const user = c.get('user');

  let apiKeyRows;

  if (user.role === 'MEMBER') {
    apiKeyRows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id));
  } else {
    apiKeyRows = await db
      .select({
        uuid: apiKeys.uuid,
        keyHash: apiKeys.keyHash,
        userId: apiKeys.userId,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .innerJoin(users, eq(users.id, apiKeys.userId))
      .where(eq(users.teamNumber, user.teamNumber));
  }

  return c.json({ apiKeys: apiKeyRows }, 200);
};
