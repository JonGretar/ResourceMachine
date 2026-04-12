# Request Tracing

ResourceMachine can write a JSON trace file for each request, recording every decision tree node that was visited and the outcome at each step.

## Enabling

Call `this.req.enableTrace(directory)` from the resource constructor or any resource method. The trace file is written when the request completes.

```ts
import { Resource } from "resource-machine";
import type { RMRequest, RMResponse } from "resource-machine";

class ArticleResource extends Resource {
  constructor(req: RMRequest, res: RMResponse) {
    super(req, res);
    // Enable tracing in development only
    if (process.env.RM_TRACE_DIR) {
      this.req.enableTrace(process.env.RM_TRACE_DIR);
    }
  }

  // ...
}
```

```sh
RM_TRACE_DIR=/tmp/rm-traces node server.js
```

## Trace File Format

Each trace file is written as `<traceDirectory>/<requestId>-<timestamp>.json`:

```json
{
  "requestId": 42,
  "method": "GET",
  "url": "/articles/5",
  "status": 200,
  "decisions": [
    "v3b13",
    "v3b12",
    "v3b11",
    "v3b10",
    "v3b9",
    "v3b8",
    "v3b7",
    "v3c3",
    "v3d4",
    "v3e5",
    "v3f6",
    "v3g7",
    "v3g8",
    "v3h10",
    "v3i12",
    "v3l13",
    "v3m16",
    "v3n16",
    "v3o16",
    "v3o18"
  ]
}
```

Decision names correspond to nodes in the [Webmachine v3 HTTP diagram](../mechanics/diagram.md).

> **Warning:** Tracing has a measurable performance cost. Do not enable it in production.
