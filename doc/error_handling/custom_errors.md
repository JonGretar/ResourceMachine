# Custom Errors

Create custom HTTP error classes by extending `HttpError`:

```ts
import { HttpError } from "resource-machine";

export class UnprocessableEntityError extends HttpError {
	constructor(message = "Unprocessable Entity") {
		super(422, message);
	}
}

export class TooManyRequestsError extends HttpError {
	constructor(message = "Rate limit exceeded") {
		super(429, message);
	}
}
```

Throw them from any resource method:

```ts
import { UnprocessableEntityError } from "./errors.js";

override async processPost() {
  const body = await this.req.getBody();
  const data = JSON.parse(body.toString());
  if (!schema.validate(data)) {
    throw new UnprocessableEntityError("Document failed schema validation");
  }
  await db.save(data);
  return true;
}
```

The response will be:

```
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"code":"UnprocessableEntity","message":"Document failed schema validation"}
```

## Passing a Cause

Use the standard `cause` option to chain errors for better debugging:

```ts
try {
	await db.save(data);
} catch (err) {
	throw new InternalServerError("Database write failed", { cause: err });
}
```

The `cause` is logged by pino but not sent to the client.
