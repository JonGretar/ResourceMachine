# Changelog

## 0.5.0

- Complete rewrite in TypeScript targeting Node.js 22
- Replaced callback-based decision tree with `async`/`await`
- Replaced `suspend`, `bunyan`, `verror`, `extend` with modern equivalents
- Added `pino` + `pino-http` for structured logging
- Added `find-my-way` trie router (O(1) matching)
- Fixed O(n²) buffer allocation in request body handling
- Added `diagnostics_channel` support for request tracing (replaces DTrace)
- Added configurable `maxBodySize` with fast 413 rejection on `Content-Length`
- Fixed `v3g7`: Vary header was never populated in old code
- Fixed `v3l17`: null dereference on missing `lastModified`
- Fixed `v3e6`: malformed `Content-Type` charset parameter (`charset:` → `charset=`)
- Fixed `v3n11`: POST redirect returned 201 instead of 303
- Fixed OPTIONS response to always include `Allow` header (RFC 7231 §4.3.7)
- Fixed 304 responses to strip content headers (RFC 7232 §4.1)
- Migrated docs from GitBook to mdBook
- Dropped Node `>=4.0.0` requirement; now requires `>=22.0.0`

## Older versions...

Let's not worry about them... I was young. And naive.
