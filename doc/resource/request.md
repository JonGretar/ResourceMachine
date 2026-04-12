# Request

`RMRequest` extends Node's [`http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) with the following additions.

## Properties

### `req.params`

Route parameters matched from the path pattern.

```ts
// Route: "/articles/:id"
// URL:   "/articles/42"
this.req.params.id; // "42"
```

### `req.query`

Parsed query string as a plain object. Multi-value keys become arrays.

```ts
// URL: "/search?q=foo&tag=a&tag=b"
this.req.query.q; // "foo"
this.req.query.tag; // ["a", "b"]
```

### `req.pathname`

The path portion of the URL, without the query string.

```ts
// URL: "/articles/42?format=json"
this.req.pathname; // "/articles/42"
```

### `req.search`

The raw query string including the leading `?`.

```ts
this.req.search; // "?format=json"
```

### `req.choices`

Negotiated content choices, set by the decision tree.

```ts
req.choices.contentType; // e.g. "application/json"
req.choices.language; // e.g. "en"
req.choices.encoding; // e.g. "identity"
req.choices.charset; // e.g. "utf-8"
```

### `req.abortSignal`

An `AbortSignal` that fires when the client disconnects. Pass this to database queries or `fetch()` calls to cancel in-flight work.

```ts
const data = await db.find(id, { signal: this.req.abortSignal });
```

### `req.log`

A [pino](https://getpino.io) logger scoped to this request (attached by `pino-http`). Includes `requestId` in every log line.

```ts
this.req.log.info({ userId }, "Fetching user");
this.req.log.error({ err }, "Database query failed");
```

## Methods

### `req.getBody()`

Returns `Promise<Buffer>`. Resolves once the full request body has been buffered. Body buffering starts immediately on connection — calling `getBody()` from any resource method is safe.

```ts
const raw = await this.req.getBody();
const body = JSON.parse(raw.toString()) as MyType;
```

Bodies exceeding `maxBodySize` (default 1 MB) are rejected with `413 Payload Too Large` before buffering begins.

### `req.baseURI(path)`

Constructs an absolute URI from a path using the incoming `Host` header.

```ts
this.req.baseURI("/articles/42"); // "http://example.com/articles/42"
```

### `req.enableTrace(directory)`

Writes a JSON trace file for this request into `directory`. Each file records the sequence of decision tree nodes visited. **Enabling this has a significant performance cost** — use only during development.

```ts
this.req.enableTrace("/tmp/rm-traces");
```
