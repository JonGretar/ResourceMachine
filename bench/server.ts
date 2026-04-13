/**
 * Minimal benchmark server.
 *
 * Routes:
 *   GET /ping          — trivial JSON response, no async work
 *   GET /async         — simulates one await (microtask), still no I/O
 *   GET /articles/:id  — route parameter extraction
 *   GET /etag          — resource with a fixed ETag
 *   GET /missing       — resource that does not exist (→ 404 path)
 *   POST /submit       — buffers a request body (→ 204)
 *
 * Run with:
 *   node --import tsx/esm bench/server.ts
 */
import { createServer, Resource } from "../src/index.js";
import type { RMRequest, RMResponse } from "../src/index.js";

// Silence pino output during benchmarks — we want clean perf numbers.
import pino from "pino";
const logger = pino({ level: "silent" });

// ── /ping — bare minimum happy path ──────────────────────────────────────────

class PingResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async contentTypesProvided() {
    return {
      "application/json": () => '{"ok":true}',
    };
  }
}

// ── /async — one awaited microtask to model a fast DB lookup ─────────────────

class AsyncResource extends Resource {
  private _data: string | null = null;

  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async resourceExists(): Promise<boolean> {
    // simulate a resolved promise (no I/O, but one microtask hop)
    this._data = await Promise.resolve('{"ok":true,"source":"async"}');
    return true;
  }

  override async contentTypesProvided() {
    return {
      "application/json": () => this._data ?? "{}",
    };
  }
}

// ── /articles/:id — route parameter extraction ────────────────────────────────

class ArticleResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async contentTypesProvided() {
    const id = this.req.params["id"];
    return {
      "application/json": () => `{"id":${JSON.stringify(id)}}`,
    };
  }
}

// ── /etag — fixed ETag for conditional request benchmarking ──────────────────

class ETagResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async generateEtag(): Promise<string> {
    return "v1";
  }

  override async contentTypesProvided() {
    return {
      "application/json": () => '{"data":"stable"}',
    };
  }
}

// ── /missing — resource that does not exist → 404 ────────────────────────────

class MissingResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async resourceExists(): Promise<boolean> {
    return false;
  }
}

// ── /submit — POST endpoint that buffers request body → 204 ──────────────────

class SubmitResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
  }

  override async allowedMethods(): Promise<string[]> {
    return ["GET", "HEAD", "POST"];
  }

  override async processPost(): Promise<boolean | string> {
    await this.req.getBody();
    return true;
  }

  override async contentTypesProvided() {
    return {
      "application/json": () => '{"ok":true}',
    };
  }
}

// ── Server ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000);

const server = createServer({ logger });
server.addRoute("/ping", PingResource);
server.addRoute("/async", AsyncResource);
server.addRoute("/articles/:id", ArticleResource);
server.addRoute("/etag", ETagResource);
server.addRoute("/missing", MissingResource);
server.addRoute("/submit", SubmitResource);

await server.listen(port);
console.log(`Benchmark server listening on http://localhost:${port}`);
console.log("Routes: GET /ping  GET /async  GET /articles/:id  GET /etag  GET /missing  POST /submit");
