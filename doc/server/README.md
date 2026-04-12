# Server

Create a server with `createServer()` and register routes before calling `listen()`.

```ts
import { createServer } from "resource-machine";
import { ArticleResource } from "./resources/article.js";

const server = createServer({ name: "my-api" });

server.addRoute("/articles/:id", ArticleResource);

await server.listen(3000);
console.log(`Listening on port ${server.port}`);

// Graceful shutdown
process.on("SIGTERM", async () => {
  await server.close();
});
```

## Options

`createServer(options?)` accepts the following options:

| Option        | Type          | Default              | Description                                                                                        |
| ------------- | ------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| `name`        | `string`      | `"resource-machine"` | Logger name (appears in pino log output)                                                           |
| `maxBodySize` | `number`      | `1048576` (1 MB)     | Maximum request body size in bytes. Requests exceeding this limit receive `413 Payload Too Large`. |
| `logger`      | `pino.Logger` | auto-created         | Bring your own pino logger instance.                                                               |

## API

### `server.addRoute(path, ResourceClass)`

Register a Resource class at a path pattern. See [Dispatching](dispatching.md) for path syntax.

### `server.listen(port?, host?)`

Start the HTTP server. Returns a `Promise<void>` that resolves once the server is bound.

### `server.close()`

Gracefully stop the server. Drains existing connections and resolves once fully closed.

### `server.port`

The bound port number after `listen()` resolves. `undefined` before.

### `server.httpServer`

The underlying `http.Server` instance — useful for `supertest` integration tests.

```ts
import request from "supertest";

const server = createServer();
server.addRoute("/ping", PingResource);
await server.listen(); // random port

const res = await request(server.httpServer).get("/ping");
```
