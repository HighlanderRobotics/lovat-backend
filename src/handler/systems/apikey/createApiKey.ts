import { randomBytes } from 'crypto';
import { Context } from 'vm';
import { db } from '../../../database/drizzle/client';
import { apiKeys } from '../../../database/drizzle/schema/users';
import z from 'zod';

export const createApiKeyParamsSchema = z
  .object({ name: z.string().openapi({ example: 'My API Key' }) })
  .openapi('CreateApiKeyParams');

export const createApiKeyResponseSchema = z
  .object({ apiKey: z.string().openapi({ example: 'lvt-0123abcd...' }) })
  .openapi('CreateApiKeyResponse');

export const createApiKey = async (c: Context) => {
  const paramsAddApiKey = createApiKeyParamsSchema.parse(c.req.query());

  const user = c.get('user');

  const apiKey = `lvt-${randomBytes(32).toString('hex')}`;

  await db.insert(apiKeys).values({
    keyHash: apiKey,
    uuid: crypto.randomUUID(),
    name: paramsAddApiKey.name,
    userId: user.id,
    createdAt: new Date(),
  });

  return c.json({ apiKey }, 200);
};
