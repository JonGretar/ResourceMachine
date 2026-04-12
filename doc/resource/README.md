# Resource Handlers

Resources are TypeScript classes that extend the `Resource` base class. Override only the methods you need — every method has a safe HTTP default.

```ts
import { Resource } from "resource-machine";

class ArticleResource extends Resource {
  private article: Article | null = null;

  override async allowedMethods() {
    return ["GET", "HEAD", "PUT", "DELETE"];
  }

  override async resourceExists() {
    // Cache the DB lookup on `this` — reused by contentTypesProvided
    this.article = await db.find(this.req.params.id ?? "");
    return this.article !== null;
  }

  override async contentTypesProvided() {
    return {
      "application/json": () => JSON.stringify(this.article),
    };
  }
}
```

## Per-Request Instantiation

The router holds the class. The decision machine calls `new ArticleResource(req, res)` for each incoming request. This means:

- `this.req` and `this.res` are available in every method.
- `this` is a natural cache for data fetched during one decision (like `resourceExists`) and reused in a later one (like `contentTypesProvided`).
- There is no shared mutable state between concurrent requests.

## Available in All Methods

| Property          | Type                                  | Description                                     |
| ----------------- | ------------------------------------- | ----------------------------------------------- |
| `this.req`        | `RMRequest`                           | Augmented incoming request                      |
| `this.res`        | `RMResponse`                          | Augmented server response                       |
| `this.req.params` | `Record<string, string \| undefined>` | Route parameters                                |
| `this.req.query`  | `Record<string, string \| string[]>`  | Query string parameters                         |
| `this.req.log`    | `pino.Logger`                         | Per-request pino logger (attached by pino-http) |

## Defaults

If you do not override a method, it falls back to a default that produces correct HTTP behavior for a read-only resource:

| Method                 | Default                          |
| ---------------------- | -------------------------------- |
| `serviceAvailable`     | `true`                           |
| `allowedMethods`       | `["GET", "HEAD"]`                |
| `resourceExists`       | `true`                           |
| `isAuthorized`         | `true`                           |
| `isForbidden`          | `false`                          |
| `contentTypesProvided` | `{ "application/json": toJSON }` |

See [Resource Functions](resource_functions.md) for the full list.
