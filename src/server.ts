import { createServer as createHttpServer } from "node:http";
import type { Server as HttpServer } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { Router } from "./routes.js";
import { augmentRequest } from "./request.js";
import { augmentResponse } from "./response.js";
import { handleRequest, type ResourceClass } from "./decision_core.js";
import { NotFoundError, PayloadTooLargeError } from "./errors/index.js";

export interface ServerOptions {
  /** Server name — used as pino logger name. Default: 'resource-machine' */
  name?: string;
  /** Maximum request body size in bytes. Default: 1MB */
  maxBodySize?: number;
  /** Bring your own pino logger. Default: creates one from `name`. */
  logger?: pino.Logger;
}

export interface RMServer {
  /** Register a Resource class at the given path pattern. */
  addRoute(path: string, ResourceCtor: ResourceClass): void;
  /** Start listening. Resolves once the server is bound. */
  listen(port?: number, host?: string): Promise<void>;
  /** Gracefully stop the server. Resolves once all connections are closed. */
  close(): Promise<void>;
  /** Bound port number after listen() resolves; undefined before. */
  readonly port: number | undefined;
  /** Underlying http.Server for advanced use (e.g. supertest). */
  readonly httpServer: HttpServer;
}

export function createServer(options: ServerOptions = {}): RMServer {
  const logger = options.logger ?? pino({ name: options.name ?? "resource-machine" });

  const router = new Router();

  // pino-http attaches req.log and logs on response finish.
  // Must be called before handleRequest so req.log is available in resources.
  const httpLogger = pinoHttp({ logger });

  const maxBodySize = options.maxBodySize ?? 1024 * 1024;

  const server = createHttpServer((req, res) => {
    httpLogger(req, res);

    // Fast-reject: Content-Length already exceeds limit — no need to buffer.
    const rawCL = req.headers["content-length"];
    if (rawCL !== undefined) {
      const declared = parseInt(rawCL, 10);
      if (!Number.isNaN(declared) && declared > maxBodySize) {
        new PayloadTooLargeError("Request body exceeds maximum size").toResponse(res);
        req.resume(); // drain so the connection can be reused
        return;
      }
    }

    const rmReq = augmentRequest(req, options.maxBodySize !== undefined ? { maxBodySize: options.maxBodySize } : {});
    const rmRes = augmentResponse(res);

    const match = router.match(req.method ?? "GET", rmReq.pathname);
    if (match === null) {
      new NotFoundError("No route matches this path").toResponse(res);
      return;
    }

    rmReq.params = match.params;

    // Fire-and-forget: handleRequest ends the response internally.
    // Errors are caught inside handleRequest and written to res.
    void handleRequest(match.ResourceCtor, rmReq, rmRes);
  });

  return {
    addRoute(path: string, ResourceCtor: ResourceClass): void {
      router.addRoute(path, ResourceCtor);
    },

    listen(port?: number, host?: string): Promise<void> {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        if (port !== undefined && host !== undefined) {
          server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
          });
        } else if (port !== undefined) {
          server.listen(port, () => {
            server.off("error", reject);
            resolve();
          });
        } else {
          server.listen(() => {
            server.off("error", reject);
            resolve();
          });
        }
      });
    },

    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        // closeAllConnections() (Node 18.2+) forcibly closes idle connections
        // so close() doesn't hang waiting for keep-alive sockets to expire.
        server.closeAllConnections();
        server.close((err) => {
          if (err !== undefined) reject(err);
          else resolve();
        });
      });
    },

    get port(): number | undefined {
      const addr = server.address();
      if (addr !== null && typeof addr !== "string") return addr.port;
      return undefined;
    },

    get httpServer(): HttpServer {
      return server;
    },
  };
}
