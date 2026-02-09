import { randomBytes } from 'crypto';
import z, { uuid } from 'zod';
import { db } from '../../../database/drizzle/client';
import { apiKeys } from '../../../database/drizzle/schema';
import { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { NotFound } from '../../../middleware/error';
import { rename } from 'fs';

export const renameApiKeyParamsSchema = z.object({
  name: z.string(),
  uuid: uuid(),
});

export const renameApiKeyResponseSchema = z.object({
  message: z.string(),
});

export const renameApiKey = async (c: Context) => {
  const paramsRenameApiKey = renameApiKeyParamsSchema.parse(c.req.query);

  const existingKey = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.uuid, paramsRenameApiKey.uuid));

  if (existingKey.length === 0) {
    throw new NotFound(`API key with uuid ${paramsRenameApiKey.uuid} not found`);
  }

  await db
    .update(apiKeys)
    .set({ name: paramsRenameApiKey.name })
    .where(eq(apiKeys.uuid, paramsRenameApiKey.uuid));
  return c.json(
    {
      message: `API key ${paramsRenameApiKey.uuid} renamed to ${paramsRenameApiKey.name}`,
    },
    200
  );
};
