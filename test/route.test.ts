/**
 * Routing tests — path matching, named params, wildcards.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import pino from "pino";
import { createServer, Resource } from "../src/index.js";
import type { RMServer } from "../src/index.js";
import supertest from "supertest";

const silentLogger = pino({ level: "silent" });

class SimpleResource extends Resource {}

let server: RMServer;
let agent: supertest.Agent;

describe("Routing", () => {
  before(async () => {
    server = createServer({ logger: silentLogger });

    server.addRoute("/basic", SimpleResource);
    server.addRoute("/params/:myparam", SimpleResource);
    server.addRoute("/splat/*", SimpleResource);
    // Optional params are not supported by find-my-way natively.
    // Register two routes as the documented workaround.
    server.addRoute("/optional", SimpleResource);
    server.addRoute("/optional/:extra", SimpleResource);

    await server.listen(0);
    agent = supertest(server.httpServer);
  });

  after(async () => {
    await server.close();
  });

  it("basic string route → 200", async () => {
    await agent.get("/basic").expect(200);
  });

  it("named param route → 200", async () => {
    await agent.get("/params/steve").expect(200);
  });

  it("wildcard (splat) route → 200", async () => {
    await agent.get("/splat/who/is/this/steve").expect(200);
  });

  it("optional param — without segment → 200", async () => {
    await agent.get("/optional").expect(200);
  });

  it("optional param — with segment → 200", async () => {
    await agent.get("/optional/somevalue").expect(200);
  });

  it("unknown route → 404", async () => {
    await agent.get("/does-not-exist").expect(404);
  });

  it("named param is available in resource", async () => {
    let capturedParam: string | undefined;

    class ParamResource extends Resource {
      async contentTypesProvided() {
        capturedParam = this.req.params["myparam"];
        return { "application/json": () => JSON.stringify({ param: capturedParam }) };
      }
    }

    server.addRoute("/capture/:myparam", ParamResource);
    const res = await agent.get("/capture/hello").expect(200);
    assert.equal(capturedParam, "hello");
    assert.deepEqual(JSON.parse(res.text), { param: "hello" });
  });

  it("wildcard param available as params['*']", async () => {
    let capturedSplat: string | undefined;

    class SplatResource extends Resource {
      async contentTypesProvided() {
        capturedSplat = this.req.params["*"];
        return { "application/json": () => JSON.stringify({ splat: capturedSplat }) };
      }
    }

    server.addRoute("/capture-splat/*", SplatResource);
    await agent.get("/capture-splat/a/b/c").expect(200);
    assert.equal(capturedSplat, "a/b/c");
  });
});
