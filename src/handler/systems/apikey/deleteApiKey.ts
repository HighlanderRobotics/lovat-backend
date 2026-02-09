import z from 'zod';
import { db } from '../../../database/drizzle/client';
import { apiKeys, users } from '../../../database/drizzle/schema';
import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { NotFound, Forbidden } from '../../../middleware/error';

export const deleteApiKeyParamsSchema = z.object({
  uuid: z.string().openapi({ example: '123e4567-e89b-12d3-a456-426614174000' }),
});

export const deleteApiKeyResponseSchema = z.object({
  message: z.string().openapi({ example: 'API key 123e4567-e89b-12d3-a456-426614174000 deleted' }),
});

export const deleteApiKey = async (c: Context) => {
  const paramsDeleteApiKey = deleteApiKeyParamsSchema.parse(c.req.query);
  const user = c.get('user');

  const keyOwner = await db
    .select({
      uuid: apiKeys.uuid,
      userId: apiKeys.userId,
      ownerTeamNumber: users.teamNumber,
    })
    .from(apiKeys)
    .innerJoin(users, eq(users.id, apiKeys.userId))
    .where(eq(apiKeys.uuid, paramsDeleteApiKey.uuid));

  if (keyOwner.length === 0) {
    throw new NotFound('API key not found');
  }

  const owner = keyOwner[0];

  if (user.role === 'MEMBER') {
    if (owner.userId !== user.id) {
      throw new Forbidden("Cannot delete another user's key");
    }
  } else {
    if (owner.ownerTeamNumber !== user.teamNumber) {
      throw new Forbidden('Key not in your team');
    }
  }

  await db.delete(apiKeys).where(eq(apiKeys.uuid, paramsDeleteApiKey.uuid));

  return c.json({ message: `API key ${paramsDeleteApiKey.uuid} deleted` }, 200);
};
