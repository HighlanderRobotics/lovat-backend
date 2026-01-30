import { combine, blockApiKeys, blockNonScoutingLeads } from '../auth/builder';
import { OpenAPIHono } from '@hono/zod-openapi';
import deleteUserById, { DeleteUserParamsSchema } from '../handler/users/deleteUser';
import { ErrorResponseSchema } from '../openapi/schemas/common';
import { UnauthorizedResponse, ForbiddenResponse, NotFoundResponse } from '../openapi/responses';

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
      401: UnauthorizedResponse,
      403: ForbiddenResponse,
      404: NotFoundResponse,
    },
  },
  deleteUserById
);

export default user;
