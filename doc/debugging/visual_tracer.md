# Visual Tracer

The visual tracer renders request trace files as an annotated decision diagram, making it easy to see exactly which path through the HTTP state machine a given request took.

## Viewing a Trace

Trace files are written by `req.enableTrace(directory)` — see [Request Tracing](request_trace.md) for setup.

Once you have a trace file, you can map the decision sequence back to the [HTTP diagram](../mechanics/diagram.md) manually, or use a diagram tool with the node names as reference:

1. Open the [HTTP decision diagram](../mechanics/diagram.md).
2. Locate the first decision in `decisions[]` (always `v3b13`).
3. Follow each step in order — the diagram branches are labeled with the return value that leads to each path.

## Interpreting Decision Names

Decision names follow the pattern `v3<column><row>`:

| Name    | Description                      |
| ------- | -------------------------------- |
| `v3b13` | Service available?               |
| `v3b12` | Known method?                    |
| `v3b11` | URI too long?                    |
| `v3b10` | Method allowed?                  |
| `v3c3`  | Accept header present?           |
| `v3d4`  | Acceptable media type available? |
| `v3g7`  | Resource exists?                 |
| `v3l13` | If-Modified-Since present?       |
| `v3o18` | Conflict?                        |

See the full [HTTP diagram](../mechanics/diagram.md) for the complete node map.
