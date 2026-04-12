# Dispatching

Routes are added with `server.addRoute(path, ResourceClass)`.

The router uses [find-my-way](https://github.com/delvedor/find-my-way) (the same trie router as Fastify), giving O(1) route matching regardless of the number of routes.

## Path Syntax

### Static paths

```
"/articles"       matches only "/articles"
"/articles/new"   matches only "/articles/new"
```

### Named parameters

```
"/articles/:id"           matches "/articles/42",  params: { id: "42" }
"/users/:user/posts/:id"  matches "/users/jon/posts/5", params: { user: "jon", id: "5" }
```

Parameters are available at `this.req.params.id` inside resource methods.

### Wildcard

```
"/assets/*"   matches "/assets/img/logo.png", params: { "*": "img/logo.png" }
```

### Regex constraints on parameters

```
"/lang/:lang([a-z]{2})"   matches "/lang/en" but not "/lang/english"
```

## Resource Class

The second argument to `addRoute` must be a class that extends `Resource`. The decision machine constructs a new instance per request:

```ts
import { createServer, Resource } from "resource-machine";

class PingResource extends Resource {
  override async contentTypesProvided() {
    return { "text/plain": () => "pong" };
  }
}

const server = createServer();
server.addRoute("/ping", PingResource);
```

### Injecting shared state via factory

When a resource needs access to a shared object (e.g. a database connection pool), use a factory function that closes over the shared value and returns a `ResourceClass`:

```ts
import type { ResourceClass } from "resource-machine";
import { Resource } from "resource-machine";
import type { Database } from "./db.js";

export function createArticleResource(db: Database): ResourceClass {
  return class ArticleResource extends Resource {
    private article: Article | null = null;

    override async resourceExists() {
      this.article = await db.find(this.req.params.id ?? "");
      return this.article !== null;
    }

    override async contentTypesProvided() {
      return {
        "application/json": () => JSON.stringify(this.article),
      };
    }
  };
}

// Registration
server.addRoute("/articles/:id", createArticleResource(db));
```

Shared resources (DB pools, config) belong on class statics or module scope — not on `this`. `this` is per-request.
