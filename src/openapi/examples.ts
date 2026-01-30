export const ErrorExamples = {
  BadRequest: { error: { message: 'Bad Request', code: 'BAD_REQUEST' } },
  InvalidParams: { error: { message: 'Invalid request parameters', code: 'INVALID_PARAMS' } },
  MissingParams: { error: { message: 'Missing required parameters', code: 'MISSING_PARAMS' } },
  ValidationError: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR' } },
  Unauthorized: { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
  Forbidden: { error: { message: 'Forbidden', code: 'FORBIDDEN' } },
  NotFound: { error: { message: 'Resource not found', code: 'NOT_FOUND' } },
  RouteNotFound: { error: { message: 'Endpoint not found', code: 'ROUTE_NOT_FOUND' } },
  UnprocessableEntity: { error: { message: 'Unprocessable Entity', code: 'UNPROCESSABLE_ENTITY' } },
  TooManyRequests: { error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
  InternalServerError: {
    error: { message: 'Internal Server Error', code: 'INTERNAL_SERVER_ERROR' },
  },
} as const;

export const errorExamplesComponents = {
  BadRequestError: {
    summary: 'Bad Request',
    description: 'Generic 400 error for malformed requests',
    value: ErrorExamples.BadRequest,
  },
  InvalidParamsError: {
    summary: 'Invalid Params',
    description: '400 when provided parameters fail validation',
    value: ErrorExamples.InvalidParams,
  },
  MissingParamsError: {
    summary: 'Missing Params',
    description: '400 when required parameters are missing',
    value: ErrorExamples.MissingParams,
  },
  ValidationError: {
    summary: 'Validation Error',
    description: '400 when request body validation fails',
    value: ErrorExamples.ValidationError,
  },
  UnauthorizedError: {
    summary: 'Unauthorized',
    description: '401 when authentication fails or is missing',
    value: ErrorExamples.Unauthorized,
  },
  ForbiddenError: {
    summary: 'Forbidden',
    description: '403 when user lacks required permissions',
    value: ErrorExamples.Forbidden,
  },
  NotFoundError: {
    summary: 'Not Found',
    description: '404 when resource is not found',
    value: ErrorExamples.NotFound,
  },
  RouteNotFoundError: {
    summary: 'Route Not Found',
    description: '404 when endpoint path does not exist',
    value: ErrorExamples.RouteNotFound,
  },
  UnprocessableEntityError: {
    summary: 'Unprocessable Entity',
    description: '422 when request is well-formed but semantically invalid',
    value: ErrorExamples.UnprocessableEntity,
  },
  TooManyRequestsError: {
    summary: 'Too Many Requests',
    description: '429 when rate limits are exceeded',
    value: ErrorExamples.TooManyRequests,
  },
  InternalServerError: {
    summary: 'Internal Server Error',
    description: '500 for unexpected server errors',
    value: ErrorExamples.InternalServerError,
  },
} as const;
