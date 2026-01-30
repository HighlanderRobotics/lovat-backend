import { combine, blockApiKeys, blockNonScoutingLeads } from '../auth/builder';
import { OpenAPIHono } from '@hono/zod-openapi';
import deleteUserById, { DeleteUserParamsSchema } from '../handler/users/deleteUser';
import { ErrorResponseSchema } from '../openapi/schemas/common';

const user = new OpenAPIHono();

// Apply auth middlewares for all routes in this router
user.use(combine(blockApiKeys(), blockNonScoutingLeads()));

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
    security: [{ DashboardAuth: [] }],
  },
  deleteUserById
);

export default user;
