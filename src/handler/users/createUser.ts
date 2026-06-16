import { db } from '../../database/drizzle/client';
import { users } from '../../database/drizzle/schema/users';

const createUser = async (c: any) => {
  console.log('Creating user');
  const [user] = await db
    .insert(users)
    .values({
      id: '1234567890',
      email: 'user@example.com',
      teamNumber: 8033,
      role: 'ADMIN',
    })
    .returning();

  return c.json(user, 201);
};

export default createUser;
// test endpoint for db testing stuff
