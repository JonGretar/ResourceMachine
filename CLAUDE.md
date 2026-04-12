# ResourceMachine — Claude Context

## What This Project Is

A Node.js port of [Webmachine](https://github.com/basho/webmachine/) — an HTTP
decision machine library. Implements the Webmachine v3 HTTP decision diagram
(~40 decision points) to correctly handle HTTP semantics: content negotiation,
conditional requests, authorization, ETags, etc.

Users install and extend by defining `Resource` subclasses.

## Tech Stack

| Concern                  | Tool                             |
| ------------------------ | -------------------------------- |
| Language                 | TypeScript (strict)              |
| Module format            | ESM source, dual CJS+ESM publish |
| Build                    | `tsup`                           |
| Node target              | `>=22.0.0`                       |
| Linting + formatting     | `biome`                          |
| Unit testing             | `node:test`                      |
| HTTP integration testing | `supertest`                      |
| Logging                  | `pino` + `pino-http`             |
| Router                   | `find-my-way`                    |
| MIME types               | `mime` v4                        |
| Content negotiation      | `negotiator`                     |

## Source Layout

```
src/
  server.ts              — createServer(), listen/close
  routes.ts              — route registration, find-my-way wrapper
  resource.ts            — Resource base class
  request.ts             — request augmentation, body buffering
  response.ts            — response augmentation, body encoding
  decision_core.ts       — async decision loop
  debug.ts               — diagnostics_channel tracing
  errors/                — HTTP error classes
  decision_tree/
    v3/
      tree.ts            — all 40+ decision functions
test/
  webmachine.test.ts
  body.test.ts
  route.test.ts
  helpers/
    resource_helper.ts
```

## Resource Design

Per-request class instantiation. Router holds the class; decision machine `new`s it per request:

```ts
server.addRoute("/articles/:id", ArticleResource);
// per request: new ArticleResource(req, res)
```

- `this.req` / `this.res` available in all methods
- `this` is the natural place to cache DB lookups across decision calls
- Shared state (DB pools, config) goes on class statics or module scope

## Key Behaviors

1. Full v3 Webmachine decision diagram — all ~40 decision points, correct branching
2. Content negotiation — `Accept`, `Accept-Language`, `Accept-Charset`, `Accept-Encoding`
3. Conditional requests — ETag, Last-Modified, If-Match, If-None-Match, If-Unmodified-Since, If-Modified-Since
4. `isAuthorized()` returns `boolean` or a WWW-Authenticate scheme string
5. Response bodies can be `string | Buffer | Readable`
6. Request bodies are always fully buffered — `getBody()` returns `Promise<Buffer>`
7. Content-MD5 validation on request bodies
8. Route parameters: `:param`, `*` (wildcard stored as `params['*']`)
9. Optional route segments: register two routes (find-my-way has no optional syntax)

## Working Style

- Run `npm test` after any change to the decision tree or resource layer
- Run `npm run check` (biome) before committing
- Add new HTTP behaviors as tests in `test/webmachine.test.ts` using `ResourceHelper`
- Update `CHANGELOG.md` when shipping a version
- Keep `src/` strict TypeScript — no `any`, no `@ts-ignore`
