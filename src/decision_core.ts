import { finished } from "node:stream/promises";
import type { RMRequest } from "./request.js";
import type { RMResponse } from "./response.js";
import type { Resource } from "./resource.js";
import { HttpError } from "./errors/index.js";
import { type DecisionFn, start } from "./decision_tree/v3/tree.js";
import { notifyRequestStart, notifyDecision, notifyRequestEnd } from "./debug.js";

export type ResourceClass = new (req: RMRequest, res: RMResponse) => Resource;

export async function handleRequest(ResourceCtor: ResourceClass, req: RMRequest, res: RMResponse): Promise<void> {
  const resource = new ResourceCtor(req, res);
  notifyRequestStart(req);

  try {
    let decision: DecisionFn | void = start;
    while (typeof decision === "function") {
      const current: DecisionFn = decision;
      notifyDecision(req, current.name);
      decision = await current(req, res, resource);
    }

    await resource.finishRequest();

    if (res._bodyBuffer !== null) {
      // Buffer body with no transforms: set Content-Length and end in one call.
      // Node.js won't add Transfer-Encoding: chunked when Content-Length is known.
      if (!res.headersSent) {
        res.setHeader("Content-Length", res._bodyBuffer.length);
      }
      res.end(res._bodyBuffer);
    } else if (res._bodyStream !== null) {
      // Stream body: encodeBody already started the pipe.
      // _bodyStream now points to the tail of the transform chain.
      // Wait for it to drain before ending the response.
      await finished(res._bodyStream, { error: true });
      if (!res.writableEnded) res.end();
    } else {
      if (!res.writableEnded) res.end();
    }
  } catch (err: unknown) {
    if (res.headersSent) {
      // Headers already sent — can't change status; just close.
      if (!res.writableEnded) res.end();
      return;
    }
    if (err instanceof HttpError) {
      err.toResponse(res);
    } else {
      // Don't leak internal stack traces to clients.
      // The pino-http middleware logs the full error via res.log before this runs.
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          code: "InternalServerError",
          message: "An internal error occurred",
        }),
      );
    }
  } finally {
    notifyRequestEnd(req, res);
  }
}
