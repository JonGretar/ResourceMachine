# ResourceMachine

> HTTP decision machine for API gateways and microservices — Node.js port of [Webmachine](https://github.com/basho/webmachine/)

[![npm version](https://badge.fury.io/js/resource-machine.svg)](http://badge.fury.io/js/resource-machine)

---

HTTP is not just `if (req.method === 'GET')`. A production API has to get dozens of things right: content negotiation,
conditional requests, ETags, caching headers, authorization, correct 4xx/5xx codes for every edge case. Most frameworks
leave all of that to you, and most implementations get it quietly wrong.

ResourceMachine implements the full [Webmachine v3 HTTP decision
diagram](https://jongretar.github.io/ResourceMachine/mechanics/diagram.html) — roughly 40 decision points that correctly
model HTTP semantics. You describe your resource; the machine handles the protocol.

## Who it's for

ResourceMachine is designed for engineers building **API gateways** and **microservices** — backends where HTTP
correctness matters and separation of concerns reduces bugs. It is not a web application framework and does not try to
be.

If your service needs to:

- Return different representations based on `Accept` headers
- Respect `If-None-Match` / `If-Modified-Since` for cache validation
- Handle `PUT` / `DELETE` / `PATCH` with correct precondition checking
- Enforce authorization and permission rules per endpoint
- Do all of the above correctly, every time, without repeating yourself

…ResourceMachine handles the HTTP layer so you handle the business logic.

## How it works

You define a **Resource** class per endpoint. Override only the methods relevant to that endpoint — everything else
falls back to safe HTTP defaults. The decision machine instantiates your class per request and walks the diagram,
calling your methods at the right moment.

```ts
import { createServer, Resource } from "resource-machine";

class ArticleResource extends Resource {
  private article: Article | null = null;

  // Which HTTP methods are allowed?
  override async allowedMethods() {
    return ["GET", "HEAD", "PUT", "DELETE"];
  }

  // Does this resource exist? Fetch it once, cache on `this`.
  override async resourceExists() {
    this.article = await db.find(this.req.params.id);
    return this.article !== null;
  }

  // Serve it — article already fetched above, no second DB call.
  override async contentTypesProvided() {
    return {
      "application/json": () => JSON.stringify(this.article),
    };
  }

  // Accept a PUT body.
  override async contentTypesAccepted() {
    return {
      "application/json": async () => {
        const body = JSON.parse((await this.req.getBody()).toString());
        this.article = await db.update(this.req.params.id, body);
        return true;
      },
    };
  }
}

const server = createServer({ name: "articles-api" });
server.addRoute("/articles/:id", ArticleResource);
await server.listen(3000);
```

The machine takes care of: `404` when `resourceExists()` is false, `405` for disallowed methods, `406` when no content
type matches, `412` on failed preconditions, `304` for unmodified resources — all without you touching a status code.

## Requirements

- Node.js **22.0.0** or later
- TypeScript (optional but strongly recommended)

## Installation

```sh
npm install resource-machine
```

## Documentation

Full documentation at [jongretar.github.io/ResourceMachine](https://jongretar.github.io/ResourceMachine).

Examples are in [`examples/`](https://github.com/JonGretar/ResourceMachine/tree/main/examples).

## License

MIT — Copyright © 2026 Jón Grétar Borgþórsson
