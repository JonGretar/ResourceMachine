# Resource Tips

## Cache DB lookups across decisions

`resourceExists` is called early in the decision tree, well before `contentTypesProvided`. Store the result on `this` to avoid a second query:

```ts
class ArticleResource extends Resource {
  private article: Article | null = null;

  override async resourceExists() {
    this.article = await db.articles.find(this.req.params.id ?? "");
    return this.article !== null;
  }

  override async contentTypesProvided() {
    // article already fetched — no second DB call
    return {
      "application/json": () => JSON.stringify(this.article),
    };
  }
}
```

## Inject shared state via factory functions

When a resource needs a DB pool, config, or other shared object, close over it:

```ts
export function createArticleResource(db: Database): ResourceClass {
  return class ArticleResource extends Resource {
    // db is available here via closure
    override async resourceExists() {
      return (await db.find(this.req.params.id ?? "")) !== null;
    }
  };
}

server.addRoute("/articles/:id", createArticleResource(db));
```

## Throw HTTP errors from any method

Any resource method can throw an `HttpError` subclass. The decision machine catches it and sends the appropriate status code:

```ts
import { BadRequestError, ForbiddenError } from "resource-machine";

override async processPost() {
  const body = await this.req.getBody();
  let data: unknown;
  try {
    data = JSON.parse(body.toString());
  } catch {
    throw new BadRequestError("Invalid JSON");
  }
  // ...
  return true;
}
```

## Use req.log for structured logging

`this.req.log` is a pino logger scoped to the request. Every line automatically includes `requestId`:

```ts
override async resourceExists() {
  const item = await db.find(this.req.params.id ?? "");
  if (!item) {
    this.req.log.info({ id: this.req.params.id }, "Item not found");
    return false;
  }
  this.item = item;
  return true;
}
```

## Handle cancellation with AbortSignal

`this.req.abortSignal` fires when the client disconnects. Pass it to async operations:

```ts
const result = await db.slowQuery(id, { signal: this.req.abortSignal });
```

This prevents wasted work when the client navigates away or times out.

## Trace the decision tree during development

Call `this.req.enableTrace("/tmp/rm-traces")` (e.g. in your constructor) to write a JSON file for each request showing which nodes in the decision diagram were visited:

```ts
constructor(req: RMRequest, res: RMResponse) {
  super(req, res);
  if (process.env.NODE_ENV !== "production") {
    this.req.enableTrace("/tmp/rm-traces");
  }
}
```
