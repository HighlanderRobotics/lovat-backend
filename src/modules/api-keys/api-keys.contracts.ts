import { z } from '@hono/zod-openapi';
import { ApiKeyInsertSchema, ApiKeySchema } from '../../platform/database/schemas';

const ApiKeyNameSchema = z.string().trim().min(1).max(100);

export const ApiKeyPublicSchema = ApiKeySchema.omit({
  keyHash: true,
  userId: true,
})
  .extend({
    createdAt: z.iso.datetime(),
    lastUsed: z.iso.datetime().nullable(),
    username: z.string().nullable(),
  })
  .openapi('ApiKey');

export const ApiKeyListResponseSchema = z
  .object({ apiKeys: z.array(ApiKeyPublicSchema) })
  .openapi('ApiKeyListResponse');

export const ApiKeyCreateBodySchema = ApiKeyInsertSchema.pick({ name: true })
  .extend({ name: ApiKeyNameSchema })
  .openapi('ApiKeyCreateBody');

export const ApiKeyCreateResponseSchema = z
  .object({ apiKey: z.string().startsWith('lvt-') })
  .openapi('ApiKeyCreateResponse');

export const ApiKeyPathSchema = ApiKeySchema.pick({ uuid: true })
  .extend({ uuid: z.uuid() })
  .openapi('ApiKeyPath');

export const ApiKeyRenameBodySchema = ApiKeyInsertSchema.pick({ name: true })
  .extend({ name: ApiKeyNameSchema })
  .openapi('ApiKeyRenameBody');
