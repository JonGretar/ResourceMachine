# Mechanics

ResourceMachine implements the [Webmachine v3 HTTP decision diagram](diagram.md). Understanding this diagram explains why ResourceMachine handles HTTP correctly where hand-rolled frameworks often don't.

## The Decision Loop

When a request arrives, the server:

1. Constructs a new instance of your `Resource` class: `new YourResource(req, res)`.
2. Starts the decision loop at node `v3b13` (service available?).
3. At each node, calls the corresponding resource method and branches based on the return value.
4. Continues until reaching a terminal node, which sets the response status and ends the request.

The loop is a simple `while`:

```
current = v3b13
while current is a function:
    current = await current(req, res, resource)
```

Each decision function either returns the next function to call, or `void` (terminal — response already written).

## Why This Matters

HTTP has many interacting concerns: authorization must happen before content negotiation, conditional request checks must happen in the right order relative to method handling, ETags must be checked before and after modification. The diagram encodes all of this correctly. Your resource just answers questions — the machine handles the sequencing.

## Decision Functions

There are ~40 decision functions in `src/decision_tree/v3/tree.ts`, named `v3b13` through `v3p11`. Each corresponds to a box in the [HTTP diagram](diagram.md).

## Per-Request Isolation

Each request gets its own `Resource` instance. There is no shared mutable state between concurrent requests — concurrent isolation is structural, not synchronized.
