import { ErrorResponseSchema } from './schemas/common';

const json = 'application/json' as const;

export const BadRequestResponse = {
  description: 'Bad Request',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        BadRequestError: { $ref: '#/components/examples/BadRequestError' },
        InvalidParamsError: { $ref: '#/components/examples/InvalidParamsError' },
        MissingParamsError: { $ref: '#/components/examples/MissingParamsError' },
        ValidationError: { $ref: '#/components/examples/ValidationError' },
      },
    },
  },
} as const;

export const UnauthorizedResponse = {
  description: 'Unauthorized',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        UnauthorizedError: { $ref: '#/components/examples/UnauthorizedError' },
      },
    },
  },
} as const;

export const ForbiddenResponse = {
  description: 'Forbidden',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        ForbiddenError: { $ref: '#/components/examples/ForbiddenError' },
      },
    },
  },
} as const;

export const NotFoundResponse = {
  description: 'Not Found',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        NotFoundError: { $ref: '#/components/examples/NotFoundError' },
      },
    },
  },
} as const;

export const UnprocessableEntityResponse = {
  description: 'Unprocessable Entity',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        UnprocessableEntityError: { $ref: '#/components/examples/UnprocessableEntityError' },
      },
    },
  },
} as const;

export const TooManyRequestsResponse = {
  description: 'Too Many Requests',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        TooManyRequestsError: { $ref: '#/components/examples/TooManyRequestsError' },
      },
    },
  },
} as const;

export const InternalServerErrorResponse = {
  description: 'Internal Server Error',
  content: {
    [json]: {
      schema: ErrorResponseSchema,
      examples: {
        InternalServerError: { $ref: '#/components/examples/InternalServerError' },
      },
    },
  },
} as const;
