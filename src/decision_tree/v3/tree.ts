import { createHash } from "node:crypto";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  GoneError,
  InternalServerError,
  MethodNotAllowedError,
  NotAcceptableError,
  NotFoundError,
  NotImplementedError,
  PayloadTooLargeError,
  PreconditionFailedError,
  ServiceUnavailableError,
  UnsupportedMediaTypeError,
  UriTooLongError,
} from "../../errors/index.js";
import type { RMRequest } from "../../request.js";
import type { Resource } from "../../resource.js";
import type { RMResponse } from "../../response.js";
import { encodeBody, encodeBodyIfSet } from "../../response.js";

export type DecisionFn = (
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
) => Promise<DecisionFn | undefined>;

function set304(res: RMResponse): void {
  res.statusCode = 304;
  res.removeHeader("Content-Type");
  res.removeHeader("Content-Length");
  res.removeHeader("Transfer-Encoding");
}

// ────────────────────────────────────────────────────────────────────────────
// B column — request checks
// ────────────────────────────────────────────────────────────────────────────

// Service Available?
async function v3b13(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.serviceAvailable())) {
    throw new ServiceUnavailableError();
  }
  return v3b12;
}

// Known method?
async function v3b12(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const known = await resource.knownMethods();
  if (!known.includes(req.method ?? "")) {
    throw new NotImplementedError();
  }
  return v3b11;
}

// URI too long?
async function v3b11(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.uriTooLong()) {
    throw new UriTooLongError();
  }
  return v3b10;
}

// Method allowed?
async function v3b10(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const allowed = await resource.allowedMethods();
  if (!allowed.includes(req.method ?? "")) {
    res.setHeader("Allow", allowed.join(", "));
    throw new MethodNotAllowedError();
  }
  return v3b9;
}

// Content-MD5 present?
async function v3b9(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["content-md5"] ? v3b9a : v3b9b;
}

// Content-MD5 valid?
async function v3b9a(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const override = await resource.validateContentChecksum();
  if (override === true) return v3b9b;
  if (override === false) throw new BadRequestError("Content-MD5 mismatch");

  // override === undefined: compute and compare
  const body = await req.getBody();
  const computed = createHash("md5").update(body).digest("base64");
  if (req.headers["content-md5"] !== computed) {
    throw new BadRequestError("Content-MD5 mismatch");
  }
  return v3b9b;
}

// Malformed?
async function v3b9b(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.malformedRequest()) {
    throw new BadRequestError();
  }
  return v3b8;
}

// Authorized?
async function v3b8(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  // Decode Authorization header for convenience
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const spaceIdx = authHeader.indexOf(" ");
    const type = spaceIdx > -1 ? authHeader.slice(0, spaceIdx) : authHeader;
    const value = spaceIdx > -1 ? authHeader.slice(spaceIdx + 1) : "";
    if (type.toLowerCase() === "basic") {
      const decoded = Buffer.from(value, "base64").toString("utf8");
      const colonIdx = decoded.indexOf(":");
      req.authorization = {
        type: "Basic",
        username: decoded.substring(0, colonIdx),
        password: decoded.substring(colonIdx + 1),
      };
    } else {
      req.authorization = { type, value };
    }
  }

  const result = await resource.isAuthorized();
  if (result === true) return v3b7;
  if (typeof result === "string") {
    res.statusCode = 401;
    res.setHeader("WWW-Authenticate", result);
    return; // done
  }
  throw new Error("isAuthorized() must return true or a WWW-Authenticate string");
}

// Forbidden?
async function v3b7(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.isForbidden()) {
    throw new ForbiddenError();
  }
  return v3b6;
}

// Valid Content-* headers?
async function v3b6(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.validContentHeaders())) {
    throw new UnsupportedMediaTypeError("Invalid Content-* headers");
  }
  return v3b5;
}

// Known Content-Type?
async function v3b5(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.knownContentType())) {
    throw new UnsupportedMediaTypeError();
  }
  return v3b4;
}

// Request entity too large?
async function v3b4(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.validEntityLength())) {
    throw new PayloadTooLargeError();
  }
  return v3b3;
}

// OPTIONS?
async function v3b3(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (req.method === "OPTIONS") {
    const allowed = await resource.allowedMethods();
    const headers = await resource.options();
    res.writeHead(200, { Allow: allowed.join(", "), ...headers });
    return; // done
  }
  return v3c3;
}

// ────────────────────────────────────────────────────────────────────────────
// C/D/E/F columns — content negotiation
// ────────────────────────────────────────────────────────────────────────────

// Accept header exists?
async function v3c3(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!req.headers.accept) {
    // No Accept header — default to first provided type
    const types = await resource.contentTypesProvided();
    const first = Object.keys(types)[0];
    if (first) req.headers.accept = first;
  }
  return v3c4;
}

// Acceptable media type available?
async function v3c4(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const types = await resource.contentTypesProvided();
  const matched = req.negotiator.mediaTypes(Object.keys(types));
  if (!matched?.length) {
    throw new NotAcceptableError("No acceptable media type");
  }
  req.choices.contentType = matched[0];
  res.setHeader("Content-Type", matched[0] as string);
  return v3d4;
}

// Accept-Language header exists?
async function v3d4(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["accept-language"] ? v3d5 : v3e5;
}

// Acceptable language available?
async function v3d5(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.languageAvailable())) {
    throw new NotAcceptableError("No acceptable language");
  }
  return v3e5;
}

// Accept-Charset header exists?
async function v3e5(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["accept-charset"] ? v3e6 : v3f6;
}

// Acceptable charset available?
async function v3e6(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const charsetsProvided = await resource.charsetsProvided();
  if (charsetsProvided === undefined) return v3f6;

  const charsets = Object.keys(charsetsProvided);
  const charset = req.negotiator.charset(charsets);
  if (!charset) {
    throw new NotAcceptableError("No acceptable charset");
  }
  req.choices.charset = charset;
  req._charsetsProvided = charsetsProvided;
  const contentType = `${req.choices.contentType}; charset=${charset}`;
  res.setHeader("Content-Type", contentType);
  return v3f6;
}

// Accept-Encoding header exists?
async function v3f6(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["accept-encoding"] ? v3f7 : v3g7;
}

// Acceptable encoding available?
async function v3f7(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const encodingsProvided = await resource.encodingsProvided();
  const encodings = Object.keys(encodingsProvided);
  const encoding = req.negotiator.encoding(encodings);
  if (!encoding) {
    throw new NotAcceptableError("No acceptable encoding");
  }
  req.choices.encoding = encoding;
  req._encodingsProvided = encodingsProvided;
  if (encoding !== "identity") {
    res.setHeader("Content-Encoding", encoding);
  }
  return v3g7;
}

// ────────────────────────────────────────────────────────────────────────────
// G column — resource existence + If-Match
// ────────────────────────────────────────────────────────────────────────────

// Resource exists?  (also sets Vary header)
async function v3g7(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  // Set Vary header based on how many dimensions were negotiated
  const vary: string[] = [];
  const types = await resource.contentTypesProvided();
  if (Object.keys(types).length > 1) vary.push("Accept");
  const encodings = await resource.encodingsProvided();
  if (Object.keys(encodings).length > 1) vary.push("Accept-Encoding");
  const charsets = await resource.charsetsProvided();
  if (charsets !== undefined && Object.keys(charsets).length > 1) {
    vary.push("Accept-Charset");
  }
  const extra = await resource.variances();
  vary.push(...extra);
  if (vary.length > 0) res.setHeader("Vary", vary.join(", "));

  return (await resource.resourceExists()) ? v3g8 : v3h7;
}

// If-Match header exists?
async function v3g8(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["if-match"] ? v3g9 : v3h10;
}

// If-Match: * ?
async function v3g9(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  const ifMatch = req.headers["if-match"] ?? "";
  return ifMatch.replace(/"/g, "") === "*" ? v3h10 : v3g11;
}

// ETag in If-Match?
async function v3g11(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const etag = await resource.generateEtag();
  const reqEtag = (req.headers["if-match"] ?? "").replace(/"/g, "");
  if (reqEtag === etag) return v3h10;
  throw new PreconditionFailedError();
}

// ────────────────────────────────────────────────────────────────────────────
// H column — resource missing + If-Unmodified-Since
// ────────────────────────────────────────────────────────────────────────────

// If-Match exists when resource missing → 412
async function v3h7(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  if (req.headers["if-match"]) {
    throw new PreconditionFailedError();
  }
  return v3i7;
}

// If-Unmodified-Since header exists?
async function v3h10(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["if-unmodified-since"] ? v3h11 : v3i12;
}

// If-Unmodified-Since is a valid date?
async function v3h11(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  const date = new Date(req.headers["if-unmodified-since"] ?? "");
  if (Number.isNaN(date.getTime())) return v3i12;
  req.ifUnmodifiedSince = date;
  return v3h12;
}

// Last-Modified > If-Unmodified-Since → 412
async function v3h12(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const lastModified = await resource.lastModified();
  if (
    req.ifUnmodifiedSince !== undefined &&
    lastModified !== undefined &&
    lastModified.getTime() > req.ifUnmodifiedSince.getTime()
  ) {
    throw new PreconditionFailedError();
  }
  return v3i12;
}

// ────────────────────────────────────────────────────────────────────────────
// I column — PUT routing + If-None-Match
// ────────────────────────────────────────────────────────────────────────────

// Moved permanently? (PUT to non-existent resource)
async function v3i4(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const location = await resource.movedPermanently();
  if (typeof location === "string") {
    res.statusCode = 301;
    res.setHeader("Location", location);
    return; // done
  }
  return v3p3;
}

// PUT?
async function v3i7(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.method === "PUT" ? v3i4 : v3k7;
}

// If-None-Match header exists?
async function v3i12(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["if-none-match"] ? v3i13 : v3l13;
}

// If-None-Match: * ?
async function v3i13(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  const ifNoneMatch = req.headers["if-none-match"] ?? "";
  return ifNoneMatch.replace(/"/g, "") === "*" ? v3j18 : v3k13;
}

// ────────────────────────────────────────────────────────────────────────────
// J column — GET/HEAD on If-None-Match: *
// ────────────────────────────────────────────────────────────────────────────

// GET or HEAD? → 304; otherwise → 412
async function v3j18(
  req: RMRequest,
  res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    set304(res);
    return; // done
  }
  throw new PreconditionFailedError();
}

// ────────────────────────────────────────────────────────────────────────────
// K column — previously existed + ETag check
// ────────────────────────────────────────────────────────────────────────────

// Moved permanently?
async function v3k5(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const location = await resource.movedPermanently();
  if (typeof location === "string") {
    res.statusCode = 301;
    res.setHeader("Location", location);
    return; // done
  }
  return v3l5;
}

// Previously existed?
async function v3k7(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  return (await resource.previouslyExisted()) ? v3k5 : v3l7;
}

// ETag in If-None-Match?
async function v3k13(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const etag = await resource.generateEtag();
  const reqEtag = (req.headers["if-none-match"] ?? "").replace(/"/g, "");
  return reqEtag === etag ? v3j18 : v3l13;
}

// ────────────────────────────────────────────────────────────────────────────
// L column — moved temporarily + If-Modified-Since
// ────────────────────────────────────────────────────────────────────────────

// Moved temporarily?
async function v3l5(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const location = await resource.movedTemporarily();
  if (typeof location === "string") {
    res.statusCode = 307;
    res.setHeader("Location", location);
    return; // done
  }
  return v3m5;
}

// POST?
async function v3l7(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  if (req.method === "POST") return v3m7;
  throw new NotFoundError();
}

// If-Modified-Since header exists?
async function v3l13(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.headers["if-modified-since"] ? v3l14 : v3m16;
}

// If-Modified-Since is a valid date?
async function v3l14(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  const date = new Date(req.headers["if-modified-since"] ?? "");
  if (Number.isNaN(date.getTime())) return v3m16;
  req.ifModifiedSince = date;
  return v3l15;
}

// If-Modified-Since > Now? (i.e. IMS is in the future — ignore it)
async function v3l15(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.ifModifiedSince === undefined || Date.now() > req.ifModifiedSince.getTime()
    ? v3l17
    : v3m16;
}

// Last-Modified > If-Modified-Since?
async function v3l17(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const lastModified = await resource.lastModified();
  // If no lastModified or it's newer than IMS → serve the resource
  if (
    lastModified === undefined ||
    req.ifModifiedSince === undefined ||
    lastModified.getTime() > req.ifModifiedSince.getTime()
  ) {
    return v3m16;
  }
  set304(res);
  return; // done
}

// ────────────────────────────────────────────────────────────────────────────
// M column — DELETE + POST to missing
// ────────────────────────────────────────────────────────────────────────────

// POST to gone resource?
async function v3m5(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (req.method !== "POST") throw new GoneError();
  return (await resource.allowMissingPost()) ? v3n11 : v3n5gone;
}

// Allow POST to missing resource?
async function v3m7(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  return (await resource.allowMissingPost()) ? v3n11 : v3m7notfound;
}

async function v3m7notfound(): Promise<never> {
  throw new NotFoundError();
}

// DELETE?
async function v3m16(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.method === "DELETE" ? v3m20 : v3n16;
}

// Delete resource
async function v3m20(
  _req: RMRequest,
  _res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (!(await resource.deleteResource())) {
    throw new InternalServerError("deleteResource() returned false");
  }
  return v3m20b;
}

// Delete completed immediately?
async function v3m20b(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.deleteCompleted()) return v3o20;
  res.statusCode = 202;
  return; // done
}

// ────────────────────────────────────────────────────────────────────────────
// N column — POST handling
// ────────────────────────────────────────────────────────────────────────────

// Allow POST to gone resource?
async function v3n5gone(): Promise<never> {
  throw new GoneError();
}

// Redirect after POST?
async function v3n11(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.postIsCreate()) {
    const path = await resource.createPath();
    if (path === undefined) {
      throw new InternalServerError("postIsCreate is true but createPath returned undefined");
    }
    if (typeof path !== "string") {
      throw new InternalServerError("createPath must return a string");
    }
    res.setHeader("Location", req.baseURI(path));
    return acceptHelper(req, res, resource, v3n11ok);
  }

  const result = await resource.processPost();
  if (result === true) {
    return v3n11ok;
  }
  if (typeof result === "string") {
    res.setHeader("Location", req.baseURI(result));
    res.redirect = true;
    encodeBodyIfSet(req, res);
    return v3n11ok;
  }
  throw new InternalServerError("processPost() returned false");
}

async function v3n11ok(
  _req: RMRequest,
  res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  if (res.redirect) {
    const location = res.getHeader("Location");
    if (!location) {
      throw new InternalServerError("redirect is true but no Location header set");
    }
    res.statusCode = 303;
    return; // done
  }
  return v3p11;
}

// POST to existing resource?
async function v3n16(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.method === "POST" ? v3n11 : v3o16;
}

// ────────────────────────────────────────────────────────────────────────────
// O column — PUT + body generation
// ────────────────────────────────────────────────────────────────────────────

// Conflict? (for PUT to existing)
async function v3o14(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.isConflict()) throw new ConflictError();
  return acceptHelper(req, res, resource, v3p11);
}

// PUT?
async function v3o16(
  req: RMRequest,
  _res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  return req.method === "PUT" ? v3o14 : v3o18;
}

// Build response body (GET/HEAD) or encode existing body
async function v3o18(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  const buildBody = req.method === "GET" || req.method === "HEAD";
  if (buildBody) {
    const etag = await resource.generateEtag();
    if (etag !== undefined) res.setHeader("ETag", etag);

    const lastModified = await resource.lastModified();
    if (lastModified !== undefined) {
      res.setHeader("Last-Modified", lastModified.toUTCString());
    }

    const expires = await resource.expires();
    if (expires !== undefined) res.setHeader("Expires", expires.toUTCString());

    const contentType = req.choices.contentType;
    if (!contentType) {
      throw new InternalServerError("No content type chosen");
    }
    const providers = await resource.contentTypesProvided();
    const bodyFn = providers[contentType];
    if (!bodyFn) {
      throw new InternalServerError(`No body provider for ${contentType}`);
    }
    const body = await bodyFn();
    res.setBody(body);
    encodeBody(req, res);
  } else {
    encodeBodyIfSet(req, res);
  }
  return v3o18b;
}

// Multiple representations?
async function v3o18b(
  _req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.multipleChoices()) {
    res.statusCode = 300;
  } else {
    res.statusCode = 200;
  }
  return; // done
}

// Response includes an entity?
async function v3o20(
  _req: RMRequest,
  res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  if (res._bodyBuffer !== null || res._bodyStream !== null) {
    return v3o18;
  }
  res.statusCode = 204;
  return; // done
}

// ────────────────────────────────────────────────────────────────────────────
// P column — PUT to new resource
// ────────────────────────────────────────────────────────────────────────────

// Conflict? (for PUT to new resource)
async function v3p3(
  req: RMRequest,
  res: RMResponse,
  resource: Resource,
): Promise<DecisionFn | undefined> {
  if (await resource.isConflict()) throw new ConflictError();
  return acceptHelper(req, res, resource, v3p11);
}

// New resource? (Location header set → 201)
async function v3p11(
  _req: RMRequest,
  res: RMResponse,
  _resource: Resource,
): Promise<DecisionFn | undefined> {
  const location = res.getHeader("Location");
  if (location) {
    res.statusCode = 201;
    return; // done
  }
  return v3o20;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function acceptHelper(
  req: RMRequest,
  _res: RMResponse,
  resource: Resource,
  next: DecisionFn,
): Promise<DecisionFn | undefined> {
  const contentType = req.headers["content-type"] ?? "application/octet-stream";
  const acceptedTypes = await resource.contentTypesAccepted();
  const handler = acceptedTypes[contentType];
  if (!handler) {
    throw new UnsupportedMediaTypeError(`I don't accept content-type: ${contentType}`);
  }
  const result = await handler();
  if (result === true) return next;
  throw new InternalServerError("Content-type handler returned false");
}

// ────────────────────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────────────────────

export { v3b13 as start };
