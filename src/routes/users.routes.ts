import { combine, blockApiKeys, blockNonAdmins } from '../auth/builder';
import { OpenAPIHono } from '@hono/zod-openapi';
import deleteUserById, { DeleteUserParamsSchema } from '../handler/users/deleteUser';
import { UnauthorizedResponse, ForbiddenResponse, NotFoundResponse } from '../openapi/responses';
import { users } from '../database/drizzle/schema';
import createUser from '../handler/users/createUser';
import { createSelectSchema } from 'drizzle-zod';

const user = new OpenAPIHono();

const UserResponseSchema = createSelectSchema(users);
// Apply auth middlewares for all routes in this router
user.use(blockApiKeys());

user.openapi(
  {
    method: 'post',
    path: '/',
    responses: {
      201: {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: UserResponseSchema,
          },
        },
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
    },
  },
  createUser
);

user.openapi(
  {
    method: 'delete',
    path: '/:id',
    request: {
      params: DeleteUserParamsSchema,
    },
    responses: {
      204: {
        description: 'User deleted successfully',
      },
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
      404: NotFoundResponse,
    },
  },
  deleteUserById
);

export default user;
