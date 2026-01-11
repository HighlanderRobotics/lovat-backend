import { auth } from '../auth/builder';
import { OpenAPIHono } from '@hono/zod-openapi';
import deleteUserById, { DeleteUserParamsSchema } from '../handler/users/deleteUser';
import { ErrorResponseSchema } from '../openapi/schemas/common';

const user = new OpenAPIHono();

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
      404: {
        description: 'User not found',
        content: {
          'application/json': {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  },
  auth.check().noApiKey().scoutingLead(),
  deleteUserById
);

export default user;
