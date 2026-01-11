import { z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { db } from '../../database/drizzle/client';
import { users } from '../../database/drizzle/schema/users';

export const DeleteUserParamsSchema = z
  .object({ id: z.string().openapi({ example: 'auth0|1234567890' }) })
  .openapi('DeleteUserParams');

const deleteUserById = async (c: any) => {
  const { id } = c.req.param();

  const existing = await db.select().from(users).where(eq(users.id, id));
  if (existing.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  await db.delete(users).where(eq(users.id, id));
  return c.body(null, 204);
};

export default deleteUserById;
