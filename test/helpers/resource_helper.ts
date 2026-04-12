import { PassThrough } from "node:stream";
import pino from "pino";
import supertest from "supertest";
import { createServer, Resource } from "../../src/index.js";
import type { RMServer } from "../../src/index.js";
import type { RMRequest, RMResponse } from "../../src/request.js";
import type { ResourceClass } from "../../src/decision_core.js";

export const http10Methods = ["GET", "POST", "HEAD"];
export const http11Methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "TRACE", "CONNECT", "OPTIONS"];

const silentLogger = pino({ level: "silent" });

export class ResourceHelper {
  readonly server: RMServer;
  private overrides: Map<string, unknown> = new Map();

  constructor() {
    this.server = createServer({ logger: silentLogger });
    this.registerRoute("/");
  }

  /** Reset overrides and re-register the default resource at '/'. */
  reset(): void {
    this.overrides.clear();
    this.registerRoute("/");
  }

  /**
   * Set a resource method to return a fixed value.
   * If value is an Error instance, the method will throw it instead.
   */
  set(name: string, value: unknown): void {
    this.overrides.set(name, value);
    this.registerRoute("/");
  }

  /**
   * Set a resource method to a function. Receives (req, res) as arguments.
   * The function is bound to the Resource instance, so `this` is available.
   */
  setFn(name: string, fn: (req: RMRequest, res: RMResponse) => unknown): void {
    const wrapper = async function (this: Resource) {
      const r = this as unknown as { req: RMRequest; res: RMResponse };
      return fn(r.req, r.res);
    };
    this.overrides.set(name, wrapper);
    this.registerRoute("/");
  }

  /** Register the helper resource at an additional path. */
  addRoute(path: string): void {
    this.registerRoute(path);
  }

  private buildClass(): ResourceClass {
    const snapshot = new Map(this.overrides);

    class TestResource extends Resource {
      [key: string]: unknown;
    }

    for (const [name, value] of snapshot) {
      if (typeof value === "function") {
        Object.defineProperty(TestResource.prototype, name, {
          value,
          configurable: true,
          writable: true,
        });
      } else if (value instanceof Error) {
        const err = value;
        Object.defineProperty(TestResource.prototype, name, {
          value: async () => {
            throw err;
          },
          configurable: true,
          writable: true,
        });
      } else {
        const val = value;
        Object.defineProperty(TestResource.prototype, name, {
          value: async () => val,
          configurable: true,
          writable: true,
        });
      }
    }

    return TestResource as unknown as ResourceClass;
  }

  private registerRoute(path: string): void {
    this.server.addRoute(path, this.buildClass());
  }
}

/** Build a silent supertest agent bound to the helper's http server. */
export function makeAgent(server: RMServer): supertest.Agent {
  return supertest(server.httpServer);
}

/** identity Transform factory — passthrough, for charsetsProvided/encodingsProvided */
export function identity(): PassThrough {
  return new PassThrough({ allowHalfOpen: false });
}
