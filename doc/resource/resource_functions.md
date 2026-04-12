# Resource Functions

All methods are `async` and called by the decision machine at the appropriate point in the HTTP diagram. Override only what you need.

---

## `serviceAvailable()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `503 Service Unavailable`. Useful for maintenance mode or circuit-breaker patterns.

---

## `knownMethods()`

> **Returns:** `Promise<string[]>` — Default: all common HTTP methods

Return `false` (via `false` not in the list) for a method to send `501 Not Implemented`. Distinct from `allowedMethods` — this is for methods the server has never heard of.

---

## `uriTooLong()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to send `414 URI Too Long`.

---

## `allowedMethods()`

> **Returns:** `Promise<string[]>` — Default: `["GET", "HEAD"]`

Methods not in this list receive `405 Method Not Allowed`. The response automatically includes an `Allow` header listing the permitted methods.

```ts
override async allowedMethods() {
  return ["GET", "HEAD", "PUT", "DELETE"];
}
```

---

## `malformedRequest()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to send `400 Bad Request`. Called before authorization, so it's appropriate for structural checks (missing required headers, invalid content-type for the method).

---

## `isAuthorized()`

> **Returns:** `Promise<boolean | string>` — Default: `true`

Return `true` to allow the request. Return `false` or a `string` to send `401 Unauthorized`. When a string is returned it is used as the `WWW-Authenticate` header value.

```ts
override async isAuthorized() {
  const auth = this.req.authorization;
  if (!auth || auth.type !== "Basic") {
    return 'Basic realm="My App"';
  }
  const valid = await checkCredentials(auth.username, auth.password);
  return valid ? true : 'Basic realm="My App"';
}
```

---

## `isForbidden()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to send `403 Forbidden`. Called after `isAuthorized` — use this for authorization (can the authenticated user access this resource?).

---

## `validContentHeaders()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `415 Unsupported Media Type`. Validates `Content-*` headers on requests with a body.

---

## `knownContentType()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `415 Unsupported Media Type`. Called when the request has a body.

---

## `validEntityLength()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `413 Payload Too Large`. Note: the server already enforces `maxBodySize` at the connection level before this is called.

---

## `options()`

> **Returns:** `Promise<Record<string, string>>` — Default: `{}`

Return headers to include in an `OPTIONS` response. The `Allow` header is added automatically.

---

## `contentTypesProvided()`

> **Returns:** `Promise<Record<string, BodyProvider>>`

Maps `Content-Type` values to body-producer functions. Content negotiation is driven by this. A client `Accept` header that doesn't match any key here receives `406 Not Acceptable`.

```ts
override async contentTypesProvided() {
  return {
    "application/json": () => JSON.stringify(this.data),
    "text/html": () => renderHTML(this.data),
    "text/plain": () => this.data.name,
  };
}
```

Producer functions can return `string | Buffer | Readable | Promise<...>`. Streaming is supported by returning a `Readable`.

---

## `contentTypesAccepted()`

> **Returns:** `Promise<Record<string, () => boolean | Promise<boolean>>>` — Default: `{}`

Maps `Content-Type` values to handler functions for incoming request bodies (PUT, POST). Use `this.req.getBody()` to read the body.

```ts
override async contentTypesAccepted() {
  return {
    "application/json": async () => {
      const raw = await this.req.getBody();
      const body = JSON.parse(raw.toString());
      await db.save(this.req.params.id, body);
      return true;
    },
  };
}
```

---

## `resourceExists()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `404 Not Found` (or trigger the `previouslyExisted` / `allowMissingPost` branches). Cache the fetched resource on `this` for reuse in other methods.

---

## `generateEtag()`

> **Returns:** `Promise<string | undefined>` — Default: `undefined`

Return a string to set the `ETag` header and enable conditional request handling (`If-Match`, `If-None-Match`).

---

## `lastModified()`

> **Returns:** `Promise<Date | undefined>` — Default: `undefined`

Return a `Date` to set the `Last-Modified` header and enable `If-Modified-Since` / `If-Unmodified-Since` checks.

---

## `expires()`

> **Returns:** `Promise<Date | undefined>` — Default: `undefined`

Return a `Date` to set the `Expires` header.

---

## `multipleChoices()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to send `300 Multiple Choices`.

---

## `previouslyExisted()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` when a resource once existed but no longer does. Enables the `movedPermanently` / `movedTemporarily` checks before falling back to `410 Gone`.

---

## `movedPermanently()`

> **Returns:** `Promise<string | false>` — Default: `false`

Return a URL string to send `301 Moved Permanently` with that `Location`. Return `false` to continue.

---

## `movedTemporarily()`

> **Returns:** `Promise<string | false>` — Default: `false`

Return a URL string to send `307 Temporary Redirect` with that `Location`. Return `false` to continue.

---

## `allowMissingPost()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to allow POST requests to resources that don't exist (`resourceExists` returned `false`).

---

## `postIsCreate()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to treat POST as a create-and-redirect operation. When `true`, `createPath()` is called and the request continues as a PUT to that path.

---

## `createPath()`

> **Returns:** `Promise<string | undefined>` — Default: `undefined`

Required when `postIsCreate()` returns `true`. Return the URI path for the newly created resource.

---

## `processPost()`

> **Returns:** `Promise<boolean | string>` — Default: `false`

Called when `postIsCreate()` returns `false`. Perform the POST action. Return `true` on success, or a URL string to redirect.

---

## `isConflict()`

> **Returns:** `Promise<boolean>` — Default: `false`

Return `true` to send `409 Conflict` on PUT requests.

---

## `deleteResource()`

> **Returns:** `Promise<boolean>` — Default: `false`

Perform the DELETE. Return `true` if deletion was initiated.

---

## `deleteCompleted()`

> **Returns:** `Promise<boolean>` — Default: `true`

Called after a successful `deleteResource`. Return `false` if deletion is async and not yet confirmed (sends `202 Accepted` instead of `204 No Content`).

---

## `languageAvailable()`

> **Returns:** `Promise<boolean>` — Default: `true`

Return `false` to send `406 Not Acceptable` when no acceptable language is available.

---

## `charsetsProvided()`

> **Returns:** `Promise<Record<string, () => Transform> | undefined>` — Default: `undefined`

Return a map of charset name to transform stream factory. When `undefined`, no charset negotiation is performed.

---

## `encodingsProvided()`

> **Returns:** `Promise<Record<string, () => Transform>>` — Default: `{ identity: ... }`

Return a map of encoding name to transform stream factory. The `identity` encoding (no-op) is always available.

---

## `variances()`

> **Returns:** `Promise<string[]>` — Default: `[]`

Additional header names to include in the `Vary` response header. The standard negotiation headers (`Accept`, `Accept-Language`, `Accept-Charset`, `Accept-Encoding`) are added automatically.

---

## `validateContentChecksum()`

> **Returns:** `Promise<boolean | undefined>` — Default: `undefined`

When the request includes a `Content-MD5` header: return `true` to accept, `false` to reject with `400 Bad Request`, or `undefined` to let ResourceMachine validate it automatically.

---

## `finishRequest()`

> **Returns:** `Promise<void>`

Called at the end of every request (success or error). Use for cleanup, metrics, or finalization logic.
