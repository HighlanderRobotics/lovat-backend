export class HttpError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = this.constructor.name;
  }
}

export class BadRequest extends HttpError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class InvalidParams extends HttpError {
  constructor(message = 'Invalid request parameters') {
    super(message, 400, 'INVALID_PARAMS');
  }
}

export class MissingParams extends HttpError {
  constructor(message = 'Missing required parameters') {
    super(message, 400, 'MISSING_PARAMS');
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}
export class Unauthorized extends HttpError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
export class Forbidden extends HttpError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
export class NotFound extends HttpError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class RouteNotFound extends HttpError {
  constructor(message = 'Endpoint not found') {
    super(message, 404, 'ROUTE_NOT_FOUND');
  }
}
export class UnprocessableEntity extends HttpError {
  constructor(message = 'Unprocessable Entity') {
    super(message, 422, 'UNPROCESSABLE_ENTITY');
  }
}
export class TooManyRequests extends HttpError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

export const handleErrors = async (ctx: any, next: any) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof HttpError) {
      return ctx.json(
        {
          error: {
            message: err.message,
            code: err.code,
          },
        },
        err.status
      );
    }

    console.error('UNHANDLED ERROR:', err);
    return ctx.json(
      {
        error: {
          message: 'Internal Server Error',
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
      500
    );
  }
};
