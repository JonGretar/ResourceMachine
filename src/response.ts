import type { ServerResponse } from "node:http";
import { PassThrough, Readable, type Transform } from "node:stream";
import type { RMRequest } from "./request.js";

export interface RMResponse extends ServerResponse {
  _bodyBuffer: Buffer | null;
  _bodyStream: Readable | null;
  redirect: boolean;
  setBody(body: string | Buffer | Readable): void;
}

export function augmentResponse(res: ServerResponse): RMResponse {
  const rmRes = res as RMResponse;
  rmRes._bodyBuffer = null;
  rmRes._bodyStream = null;
  rmRes.redirect = false;

  rmRes.setBody = (body: string | Buffer | Readable): void => {
    if (typeof body === "string") {
      rmRes._bodyBuffer = Buffer.from(body);
      rmRes._bodyStream = null;
    } else if (Buffer.isBuffer(body)) {
      rmRes._bodyBuffer = body;
      rmRes._bodyStream = null;
    } else if (body instanceof Readable) {
      body.pause(); // prevent data loss before pipe is established
      rmRes._bodyStream = body;
      rmRes._bodyBuffer = null;
    }
  };

  return rmRes;
}

export function encodeBodyIfSet(req: RMRequest, res: RMResponse): void {
  if (res._bodyStream !== null || res._bodyBuffer !== null) {
    encodeBody(req, res);
  }
}

export function encodeBody(req: RMRequest, res: RMResponse): void {
  const charsetFn = req.choices.charset !== undefined ? req._charsetsProvided?.[req.choices.charset] : undefined;
  const encodingFn =
    req.choices.encoding !== undefined && req.choices.encoding !== "identity"
      ? req._encodingsProvided?.[req.choices.encoding]
      : undefined;

  // Identity fast path: no transforms needed.
  // Leave _bodyBuffer intact so decision_core can send it with Content-Length.
  // For stream bodies, pipe directly to res.
  if (!charsetFn && !encodingFn) {
    if (res._bodyStream !== null) {
      const source = res._bodyStream;
      source.pipe(res, { end: false });
      source.resume();
    }
    return;
  }

  // Transform path: charset and/or encoding transforms required.
  const charsetStream: Transform = charsetFn ? charsetFn() : new PassThrough({ allowHalfOpen: false });
  const encodeStream: Transform = encodingFn ? encodingFn() : new PassThrough({ allowHalfOpen: false });

  // Wrap buffer body in a readable so the pipeline is uniform.
  if (res._bodyBuffer !== null) {
    const pt = new PassThrough({ allowHalfOpen: false });
    pt.pause();
    pt.push(res._bodyBuffer);
    pt.end();
    res._bodyBuffer = null;
    res._bodyStream = pt;
  }

  if (res._bodyStream === null) return;

  const source = res._bodyStream;
  source.pipe(charsetStream).pipe(encodeStream).pipe(res, { end: false });

  // Point _bodyStream at the tail of the pipeline so decision_core waits
  // on the right stream — source 'end' fires before transforms drain.
  res._bodyStream = encodeStream;

  source.resume();
}
