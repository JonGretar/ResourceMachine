import type { IncomingMessage } from "node:http";
import type { Transform } from "node:stream";
import Negotiator from "negotiator";
import { PayloadTooLargeError } from "./errors/index.js";

const DEFAULT_MAX_BODY_SIZE = 1024 * 1024; // 1 MB

export interface BodyChoices {
  language: string | undefined;
  contentType: string | undefined;
  encoding: string | undefined;
  charset: string | undefined;
}

export interface DecisionTrace {
  enabled: boolean;
  decisions: string[];
  traceDirectory?: string;
}

export interface Authorization {
  type: string;
  username?: string;
  password?: string;
  value?: string;
}

export interface RMRequest extends IncomingMessage {
  requestId: number;
  _decisionTrace: DecisionTrace;
  choices: BodyChoices;
  query: Record<string, string | string[]>;
  search: string;
  pathname: string;
  negotiator: Negotiator;
  abortSignal: AbortSignal;
  getBody(): Promise<Buffer>;
  baseURI(path: string): string;
  enableTrace(dir: string): void;

  // Set by routing layer
  params: Record<string, string | undefined>;

  // Set during decision tree execution
  authorization?: Authorization;
  ifUnmodifiedSince?: Date;
  ifModifiedSince?: Date;
  _charsetsProvided?: Record<string, () => Transform>;
  _encodingsProvided?: Record<string, () => Transform>;
}

export interface RequestOptions {
  maxBodySize?: number;
}

let _nextId = 0;

export function augmentRequest(req: IncomingMessage, options: RequestOptions = {}): RMRequest {
  const rmReq = req as RMRequest;
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;

  rmReq.requestId = ++_nextId;
  rmReq._decisionTrace = { enabled: false, decisions: [] };
  rmReq.params = {};
  rmReq.choices = {
    language: undefined,
    contentType: undefined,
    encoding: undefined,
    charset: undefined,
  };

  // AbortController tied to request lifecycle
  const ac = new AbortController();
  rmReq.abortSignal = ac.signal;
  req.once("close", () => ac.abort());

  // Body buffering state
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let bodyFinished = false;
  let bodyError: Error | null = null;
  let resolvedBuffer: Buffer | null = null;
  const waiters: Array<(err: Error | null, buf: Buffer) => void> = [];

  function settle(err: Error | null, buf: Buffer): void {
    bodyFinished = true;
    bodyError = err;
    resolvedBuffer = buf;
    for (const waiter of waiters) {
      waiter(err, buf);
    }
    waiters.length = 0;
  }

  startBuffering();

  function startBuffering(): void {
    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBodySize) {
        const err = new PayloadTooLargeError("Request body exceeds maximum size");
        req.destroy(err);
        return;
      }
      chunks.push(chunk);
    });

    req.once("end", () => {
      settle(null, Buffer.concat(chunks));
    });

    req.once("error", (err: Error) => {
      settle(err, Buffer.alloc(0));
    });
  }

  rmReq.getBody = (): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
      if (bodyFinished) {
        if (bodyError) return reject(bodyError);
        return resolve(resolvedBuffer!);
      }

      const onAbort = (): void => {
        reject(new Error("Request aborted"));
      };
      ac.signal.addEventListener("abort", onAbort, { once: true });

      waiters.push((err, buf) => {
        ac.signal.removeEventListener("abort", onAbort);
        if (err) return reject(err);
        resolve(buf);
      });
    });
  };

  rmReq.baseURI = (path: string): string => {
    // TODO: detect TLS for protocol selection
    const host = req.headers.host ?? "localhost";
    return `http://${host}${path}`;
  };

  rmReq.enableTrace = (dir: string): void => {
    rmReq._decisionTrace.enabled = true;
    rmReq._decisionTrace.traceDirectory = dir;
  };

  // URL parsing — native URL API (url.parse is deprecated)
  const rawUrl = req.url ?? "/";
  const baseUrl = `http://${req.headers.host ?? "localhost"}`;
  const parsed = new URL(rawUrl, baseUrl);

  const query: Record<string, string | string[]> = {};
  for (const key of parsed.searchParams.keys()) {
    const values = parsed.searchParams.getAll(key);
    query[key] = values.length === 1 ? (values[0] as string) : values;
  }
  rmReq.query = query;
  rmReq.search = parsed.search;
  rmReq.pathname = parsed.pathname;

  rmReq.negotiator = new Negotiator(req);

  return rmReq;
}
