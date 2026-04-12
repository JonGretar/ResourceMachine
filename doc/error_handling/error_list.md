# Error List

All error classes are exported from `resource-machine` and extend `HttpError`.

```ts
import { BadRequestError, NotFoundError } from "resource-machine";
```

Every error has:

- `statusCode: number` — the HTTP status code
- `body: { code: string; message: string }` — the JSON response body
- `message: string` — the error message (same as `body.message`)

## HTTP Error Classes

| Status | Class                       |
| ------ | --------------------------- |
| 400    | `BadRequestError`           |
| 401    | `UnauthorizedError`         |
| 403    | `ForbiddenError`            |
| 404    | `NotFoundError`             |
| 405    | `MethodNotAllowedError`     |
| 406    | `NotAcceptableError`        |
| 409    | `ConflictError`             |
| 410    | `GoneError`                 |
| 412    | `PreconditionFailedError`   |
| 413    | `PayloadTooLargeError`      |
| 414    | `UriTooLongError`           |
| 415    | `UnsupportedMediaTypeError` |
| 500    | `InternalServerError`       |
| 501    | `NotImplementedError`       |
| 503    | `ServiceUnavailableError`   |

## Base Class

```ts
import { HttpError } from "resource-machine";

// All of the above extend HttpError
class HttpError extends Error {
	readonly statusCode: number;
	readonly body: { code: string; message: string };
}
```
