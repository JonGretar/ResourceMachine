/**
 * Response body handling tests.
 * Covers buffer, string, stream bodies; Content-Length behaviour; large bodies.
 */

import { Readable } from "node:stream";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ResourceHelper, makeAgent } from "./helpers/resource_helper.js";
import type supertest from "supertest";

let agent: supertest.Agent;
let helper: ResourceHelper;

describe("Response body handling", () => {
  before(async () => {
    helper = new ResourceHelper();
    await helper.server.listen(0);
    agent = makeAgent(helper.server);
  });

  after(async () => {
    await helper.server.close();
  });

  beforeEach(() => {
    helper.reset();
  });

  it("string body → 200 with correct content", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => "{}",
    });
    const res = await agent.get("/").expect("Content-Type", /json/).expect(200);
    assert.equal(res.text, "{}");
  });

  it("Buffer body → 200 with correct content", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => Buffer.from("{}", "utf8"),
    });
    const res = await agent.get("/").expect("Content-Type", /json/).expect(200);
    assert.equal(res.text, "{}");
  });

  it("object body (JSON.stringify) → 200 with JSON", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => JSON.stringify({}),
    });
    const res = await agent.get("/").expect("Content-Type", /json/).expect(200);
    assert.equal(res.text, "{}");
  });

  it("Readable stream body → 200 with correct content", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => {
        const s = new Readable({ read() {} });
        s.push("{}");
        s.push(null);
        return s;
      },
    });
    const res = await agent.get("/").expect("Content-Type", /json/).expect(200);
    assert.equal(res.text, "{}");
  });

  it("Accept: text/xml not provided → 406 with application/json error body", async () => {
    await agent.get("/").set("Accept", "text/xml").expect("Content-Type", "application/json").expect(406);
  });

  it("buffer response sets Content-Length header", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => '{"ok":true}',
    });
    const res = await agent.get("/").expect(200);
    assert.ok(res.headers["content-length"] !== undefined, "Content-Length must be set for buffer responses");
    assert.equal(res.headers["content-length"], String(Buffer.byteLength('{"ok":true}')));
  });

  it("stream response does not set Content-Length", async () => {
    helper.set("contentTypesProvided", {
      "application/json": () => {
        const s = new Readable({ read() {} });
        s.push('{"ok":true}');
        s.push(null);
        return s;
      },
    });
    const res = await agent.get("/").expect(200);
    // Streams use Transfer-Encoding: chunked, no Content-Length
    assert.equal(res.headers["content-length"], undefined, "Content-Length must NOT be set for stream responses");
  });
});

describe("Request body handling", () => {
  before(async () => {
    helper = new ResourceHelper();
    await helper.server.listen(0);
    agent = makeAgent(helper.server);
  });

  after(async () => {
    await helper.server.close();
  });

  beforeEach(() => {
    helper.reset();
  });

  it("large body rejected via Content-Length before decision tree", async () => {
    // Server fast-rejects when Content-Length exceeds maxBodySize (1MB default).
    // The 413 is sent before the decision tree runs.
    helper.set("allowedMethods", ["GET", "HEAD", "PUT"]);
    helper.set("contentTypesAccepted", { "application/octet-stream": () => true });
    await agent
      .put("/")
      .set("Content-Type", "application/octet-stream")
      .set("Content-Length", String(1024 * 1024 + 1))
      .expect(413);
  });

  it("body within limit is accepted", async () => {
    const small = Buffer.alloc(100, "x");
    helper.set("allowedMethods", ["GET", "HEAD", "PUT"]);
    helper.set("contentTypesAccepted", {
      "application/octet-stream": () => true,
    });
    await agent.put("/").set("Content-Type", "application/octet-stream").send(small).expect(204);
  });
});
