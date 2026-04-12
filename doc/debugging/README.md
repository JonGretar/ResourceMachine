# Debugging

ResourceMachine provides two debugging tools:

- **[Request Tracing](request_trace.md)** — writes a JSON trace file per request showing the decision tree path taken
- **[Visual Tracer](visual_tracer.md)** — view trace files as a rendered decision diagram

## Structured Logging

All server activity is logged via [pino](https://getpino.io). During development, use `pino-pretty` for human-readable output:

```sh
node server.js | npx pino-pretty -S
```

Each request log line includes `requestId`, method, URL, status, and response time.

Use `this.req.log` inside resource methods for structured per-request logging — every line automatically carries the `requestId`.
