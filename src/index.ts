// ResourceMachine — HTTP decision machine for Node.js

export { createServer } from "./server.js";
export type { ServerOptions, RMServer } from "./server.js";

export { augmentRequest } from "./request.js";
export type { RMRequest, BodyChoices, Authorization } from "./request.js";

export { augmentResponse, encodeBody, encodeBodyIfSet } from "./response.js";
export type { RMResponse } from "./response.js";

export { Resource } from "./resource.js";
export type { BodyProvider } from "./resource.js";

export { handleRequest } from "./decision_core.js";
export type { ResourceClass } from "./decision_core.js";

export {
	CHANNEL_REQUEST_START,
	CHANNEL_REQUEST_END,
	CHANNEL_DECISION,
} from "./debug.js";
export type {
	RequestStartMessage,
	RequestEndMessage,
	DecisionMessage,
} from "./debug.js";

export { HttpError, BadRequestError, UnauthorizedError, ForbiddenError,
	NotFoundError, MethodNotAllowedError, NotAcceptableError, ConflictError,
	GoneError, PreconditionFailedError, PayloadTooLargeError, UriTooLongError,
	UnsupportedMediaTypeError, InternalServerError, NotImplementedError,
	ServiceUnavailableError } from "./errors/index.js";
