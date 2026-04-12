import type { ServerResponse } from "node:http";

export class HttpError extends Error {
  readonly statusCode: number;
  readonly body: { code: string; message: string };

  constructor(statusCode: number, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.body = {
      code: this.name,
      message: message ?? this.name,
    };
  }

  /** Write this error to a Node ServerResponse. Safe to call before headers are sent. */
  toResponse(res: ServerResponse): void {
    res.writeHead(this.statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(this.body));
  }
}

// 4xx
export class BadRequestError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(400, message, options);
  }
}
export class UnauthorizedError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(401, message, options);
  }
}
export class ForbiddenError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(403, message, options);
  }
}
export class NotFoundError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(404, message, options);
  }
}
export class MethodNotAllowedError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(405, message, options);
  }
}
export class NotAcceptableError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(406, message, options);
  }
}
export class ConflictError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(409, message, options);
  }
}
export class GoneError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(410, message, options);
  }
}
export class PreconditionFailedError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(412, message, options);
  }
}
export class PayloadTooLargeError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(413, message, options);
  }
}
export class UriTooLongError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(414, message, options);
  }
}
export class UnsupportedMediaTypeError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(415, message, options);
  }
}

// 5xx
export class InternalServerError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(500, message, options);
  }
}
export class NotImplementedError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(501, message, options);
  }
}
export class ServiceUnavailableError extends HttpError {
  constructor(message?: string, options?: ErrorOptions) {
    super(503, message, options);
  }
}
