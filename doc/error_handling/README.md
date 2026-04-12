# Error Handling

## Throwing HTTP Errors

Any resource method can throw an `HttpError` subclass. The decision machine catches it and writes the appropriate HTTP response:

```ts
import { BadRequestError, NotFoundError } from "resource-machine";

override async processPost() {
  const raw = await this.req.getBody();
  let body: unknown;
  try {
    body = JSON.parse(raw.toString());
  } catch {
    throw new BadRequestError("Invalid JSON");
  }

  if (!isValid(body)) {
    throw new BadRequestError("Schema validation failed");
  }

  await db.save(body);
  return true;
}
```

The response body is a JSON object:

```json
{
	"code": "BadRequest",
	"message": "Invalid JSON"
}
```

## Logging

ResourceMachine uses [pino](https://getpino.io) for logging. Every request gets a scoped logger at `this.req.log` (attached by `pino-http`). Unhandled errors are logged at `error` level with full stack traces.

Customize the logger by passing your own pino instance to `createServer`:

```ts
import pino from "pino";
import { createServer } from "resource-machine";

const logger = pino({
	level: "debug",
	transport: {
		target: "pino-pretty",
		options: { colorize: true },
	},
});

const server = createServer({ logger });
```

## Unhandled Errors

If a resource method throws something that is not an `HttpError`, ResourceMachine logs it and responds with `500 Internal Server Error`.
