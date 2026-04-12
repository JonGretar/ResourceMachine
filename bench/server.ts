/**
 * Minimal benchmark server.
 *
 * Two routes:
 *   GET /ping     — trivial JSON response, no async work
 *   GET /async    — simulates one await (microtask), still no I/O
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

// ── Server ────────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000);

const server = createServer({ logger });
server.addRoute("/ping", PingResource);
server.addRoute("/async", AsyncResource);

await server.listen(port);
console.log(`Benchmark server listening on http://localhost:${port}`);
console.log("Routes: GET /ping  GET /async");
