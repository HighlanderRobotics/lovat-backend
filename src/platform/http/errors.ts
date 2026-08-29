import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnvironment } from '../../app/context';

export class HttpError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class Unauthorized extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class Forbidden extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFound extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export const handleErrors: ErrorHandler<AppEnvironment> = (error, context) => {
  if (error instanceof HttpError) {
    return context.json({ error: { code: error.code, message: error.message } }, error.status);
  }

  console.error(error);
  return context.json(
    { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' } },
    500
  );
};
