# Introduction

ResourceMachine is an HTTP decision machine for building API gateways and microservices in Node.js.

It is a port of [Webmachine](https://github.com/basho/webmachine/), the Erlang library that made HTTP correctness a
first-class concern. The idea: instead of writing request handlers that manually branch on method, headers, and state,
you describe your resource as a set of simple boolean and map methods, and a decision machine walks the [HTTP
diagram](mechanics/diagram.md) for you.

## The problem it solves

Most HTTP frameworks give you a blank canvas. You write a handler, you check the method, you set a status code, and you
ship it. That works fine — until you need to handle conditional requests, serve multiple content types from one
endpoint, or implement correct cache validation. At that point you're implementing a non-trivial chunk of RFC 7230–7235
by hand, and the edge cases accumulate quietly.

ResourceMachine handles the protocol layer. You handle the business logic.

## The model

Each route maps to a **Resource class**. The decision machine constructs a new instance per request and walks ~40
decision points, calling your methods when it needs answers:

- Is the service available?
- Is this method allowed?
- Is the request authorized? Forbidden?
- Does the resource exist?
- Has it been modified since the client last fetched it?
- Which content types can you provide?
- Which content types can you accept on `PUT` / `PATCH`?

Override only what's relevant. Everything else defaults to safe, correct HTTP behavior.

```ts
import { createServer, Resource } from "resource-machine";

class PingResource extends Resource {
	override async contentTypesProvided() {
		return {
			"application/json": () => JSON.stringify({ ok: true }),
		};
	}
}

const server = createServer({ name: "my-api" });
server.addRoute("/ping", PingResource);
await server.listen(3000);
```

A `GET /ping` with `Accept: application/json` returns `200` with the JSON body. A request with `Accept: text/html` returns `406`. A `DELETE /ping` returns `405`. None of that required a single `if` statement.

## Per-request instantiation

The router holds your class. The machine calls `new YourResource(req, res)` for each request. This means:

- `this.req` and `this.res` are available in every method — no threading parameters through callbacks.
- `this` is a natural place to cache DB lookups across decision calls. Fetch in `resourceExists()`, reuse in `contentTypesProvided()` — one round trip per request, not one per method call.
- Per-request instances mean zero shared mutable state between concurrent requests.

Shared resources (database pools, config, caches) belong on class statics or module scope, not on `this`.

```ts
export function createUserResource(db: Database): ResourceClass {
	return class UserResource extends Resource {
		private user: User | null = null;

		override async resourceExists() {
			this.user = await db.users.find(this.req.params.id);
			return this.user !== null;
		}

		override async isAuthorized() {
			if (this.req.authorization?.token) return true;
			return 'Bearer realm="api"';
		}

		override async contentTypesProvided() {
			return {
				"application/json": () => JSON.stringify(this.user),
			};
		}
	};
}
```

## What you get for free

By filling in your resource methods, you automatically get correct behavior for:

| Concern             | How                                                            |
| ------------------- | -------------------------------------------------------------- |
| Method enforcement  | `allowedMethods()` → `405 Method Not Allowed`                  |
| Content negotiation | `contentTypesProvided()` + `Accept` → `406` or matched type    |
| Authorization       | `isAuthorized()` returning string → `401` + `WWW-Authenticate` |
| Conditional GET     | `generateETag()` + `If-None-Match` → `304 Not Modified`        |
| Preconditions       | `If-Match` / `If-Unmodified-Since` → `412 Precondition Failed` |
| Missing resources   | `resourceExists()` → `404 Not Found`                           |
| Body validation     | `contentTypesAccepted()` → `415 Unsupported Media Type`        |
| Payload limits      | `maxBodySize` option → `413 Payload Too Large`                 |
| `HEAD` requests     | Handled automatically — no extra code                          |
| `OPTIONS`           | Returns `Allow` header, no extra code                          |
| `Vary` header       | Computed automatically from negotiation results                |

## What it is not

ResourceMachine is not a general-purpose web framework. It has no template engine, no session middleware, no static file
serving built in (though you can implement a static resource yourself). It is optimized for one thing: making it easy to
write HTTP APIs that behave correctly.

## Next steps

- [Server setup and route registration](server/README.md)
- [Resource handlers reference](resource/README.md)
- [Error handling](error_handling/README.md)
- [Debugging and tracing](debugging/README.md)
- [HTTP decision diagram](mechanics/diagram.md)
