# Response

`RMResponse` extends Node's [`http.ServerResponse`](https://nodejs.org/api/http.html#class-httpserverresponse) with the following additions.

## Properties

### `res.redirect`

Set to `true` inside `processPost` or `createPath` to make the response a `303 See Other` redirect instead of the normal `2xx`. The `Location` header must be set separately.

```ts
override async processPost() {
  const id = await createResource(this.req);
  this.res.setHeader("Location", this.req.baseURI(`/articles/${id}`));
  this.res.redirect = true;
  return true;
}
```

## Methods

### `res.setBody(body)`

Sets the response body. Accepted types:

| Type       | Description                                                   |
| ---------- | ------------------------------------------------------------- |
| `string`   | Encoded to bytes using the negotiated charset (default UTF-8) |
| `Buffer`   | Sent as-is                                                    |
| `Readable` | Piped to the response — enables streaming                     |

```ts
// String
this.res.setBody("Hello, world!");

// JSON
this.res.setBody(JSON.stringify({ ok: true }));

// Stream
this.res.setBody(createReadStream("/path/to/file.txt"));
```

`setBody` is typically called inside a `contentTypesProvided` handler, though it can also be called directly inside `processPost` when the response body should be set as part of POST handling.

## Body Providers

The more idiomatic approach is to return a body producer from `contentTypesProvided`. The return value of the producer is passed through encoding and charset transforms before being sent:

```ts
override async contentTypesProvided() {
  return {
    "application/json": () => JSON.stringify(this.data),
    "text/plain": () => `Name: ${this.data.name}`,
    "application/octet-stream": () => createReadStream(this.filePath),
  };
}
```

The producer can be sync or `async` — both are awaited before sending.
