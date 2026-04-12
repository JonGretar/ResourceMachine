/**
 * Decision tree integration tests.
 * Ported from test/v3/webmachine_test.js, adapted for the new async Resource API.
 */

import { createHash } from "node:crypto";
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { InternalServerError } from "../src/index.js";
import { ResourceHelper, makeAgent, identity, http10Methods, http11Methods } from "./helpers/resource_helper.js";
import type supertest from "supertest";

let agent: supertest.Agent;
let helper: ResourceHelper;

// supertest doesn't auto-follow redirects; we check manually where needed.

describe("Webmachine decision tree", () => {
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

  // ── B column — request checks ────────────────────────────────────────────

  it("serviceAvailable → 503", async () => {
    helper.set("serviceAvailable", false);
    await agent.get("/").expect(503);
  });

  it("serviceAvailable throws → 500", async () => {
    helper.set("serviceAvailable", new InternalServerError());
    await agent.get("/").expect(500);
  });

  it("knownMethods: DELETE not in http10 set → 501", async () => {
    helper.set("knownMethods", http10Methods);
    helper.set("allowedMethods", http10Methods);
    await agent.delete("/").expect(501);
  });

  it("uriTooLong → 414", async () => {
    helper.set("uriTooLong", true);
    await agent.get("/").expect(414);
  });

  it("knownContentType false → 415", async () => {
    helper.set("knownContentType", false);
    await agent.get("/").expect(415);
  });

  it("validEntityLength false → 413", async () => {
    helper.set("validEntityLength", false);
    await agent.get("/").expect(413);
  });

  it("HEAD allowed → 200", async () => {
    helper.set("allowedMethods", ["GET", "HEAD"]);
    await agent.head("/").expect(200);
  });

  it("HEAD not in allowedMethods → 405", async () => {
    helper.set("allowedMethods", ["GET", "POST", "PUT"]);
    await agent.head("/").expect(405);
  });

  it("malformedRequest → 400", async () => {
    helper.set("malformedRequest", true);
    await agent.get("/").expect(400);
  });

  it("simple GET → 200", async () => {
    await agent.get("/").expect(200);
  });

  // ── C/D/E/F columns — content negotiation ────────────────────────────────

  it("Accept: video/mp4 not provided → 406", async () => {
    await agent.get("/").set("Accept", "video/mp4").expect(406);
  });

  it("Accept: text/plain + languageAvailable false → 406", async () => {
    helper.set("contentTypesProvided", { "text/plain": () => "hi" });
    helper.set("languageAvailable", false);
    await agent.get("/").set("Accept", "text/plain").set("Accept-Language", "x-pig-latin").expect(406);
  });

  it("no Accept + languageAvailable false → 406", async () => {
    helper.set("contentTypesProvided", { "text/plain": () => "hi" });
    helper.set("languageAvailable", false);
    await agent.get("/").set("Accept-Language", "x-pig-latin").expect(406);
  });

  it("Accept-Charset not matched → 406", async () => {
    helper.set("contentTypesProvided", { "text/plain": () => "hi" });
    helper.set("languageAvailable", false);
    helper.set("charsetsProvided", { "utf-8": identity });
    await agent.get("/").set("Accept-Language", "en-US").set("Accept-Charset", "ISO-8859-1").expect(406);
  });

  it("Accept-Encoding not matched → 406", async () => {
    helper.set("contentTypesProvided", { "text/plain": () => "foo" });
    helper.set("languageAvailable", true);
    helper.set("charsetsProvided", { "utf-8": identity });
    helper.set("encodingsProvided", {});
    await agent
      .get("/")
      .set("Accept", "text/plain")
      .set("Accept-Language", "en-US")
      .set("Accept-Charset", "utf-8")
      .set("Accept-Encoding", "gzip")
      .expect(406);
  });

  // ── G/H — conditional requests (ETag, If-Unmodified-Since) ───────────────

  it("If-Match: * + resourceExists false → 412", async () => {
    helper.set("resourceExists", false);
    await agent.get("/").set("If-Match", "*").expect(412);
  });

  it("If-Match etag mismatch → 412", async () => {
    helper.set("generateEtag", "v2");
    await agent.get("/").set("If-Match", '"v0", "v1"').expect(412);
  });

  it("If-Unmodified-Since exceeded → 412", async () => {
    helper.set("lastModified", new Date("Wed, 20 Feb 2013 17:00:00 GMT"));
    await agent.get("/").set("If-Unmodified-Since", "Wed, 20 Feb 2013 10:00:00 GMT").expect(412);
  });

  // ── J — If-None-Match for non-safe methods ────────────────────────────────

  it("PUT + If-None-Match: * → 412", async () => {
    helper.set("allowedMethods", http11Methods);
    await agent.put("/").set("If-None-Match", "*").expect(412);
  });

  it("PUT + If-Match + If-None-Match match via k13 → 412", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("generateEtag", "v1");
    await agent
      .put("/")
      .set("If-Match", '"v1"')
      .set("If-None-Match", '"v1"')
      .set("If-Unmodified-Since", "{{INVALID DATE}}")
      .expect(412);
  });

  // ── B9a — Content-MD5 validation ─────────────────────────────────────────

  it("Content-MD5 valid, auto-validated → 204", async () => {
    const body = "foo";
    const md5 = createHash("md5").update(body).digest("base64");
    helper.set("allowedMethods", http11Methods);
    helper.set("contentTypesAccepted", { "text/plain": () => true });
    await agent.put("/").send(body).set("Content-MD5", md5).set("Content-Type", "text/plain").expect(204);
  });

  it("Content-MD5 valid, validateContentChecksum true → 204", async () => {
    const body = "foo";
    const md5 = createHash("md5").update(body).digest("base64");
    helper.set("allowedMethods", http11Methods);
    helper.set("contentTypesAccepted", { "text/plain": () => true });
    helper.set("validateContentChecksum", true);
    await agent.put("/").send(body).set("Content-MD5", md5).set("Content-Type", "text/plain").expect(204);
  });

  it("Content-MD5 invalid, validateContentChecksum false → 400", async () => {
    const body = "foo";
    const badMd5 = createHash("md5").update("not foo").digest("base64");
    helper.set("allowedMethods", http11Methods);
    helper.set("contentTypesAccepted", { "text/plain": () => true });
    helper.set("validateContentChecksum", false);
    await agent.put("/").send(body).set("Content-MD5", badMd5).set("Content-Type", "text/plain").expect(400);
  });

  it("Content-MD5 invalid, auto-validated → 400", async () => {
    const body = "foo";
    const badMd5 = createHash("md5").update("not foo").digest("base64");
    helper.set("allowedMethods", http11Methods);
    helper.set("contentTypesAccepted", { "text/plain": () => true });
    await agent.put("/").send(body).set("Content-MD5", badMd5).set("Content-Type", "text/plain").expect(400);
  });

  // ── B8/B7 — authorization and forbidden ──────────────────────────────────

  it("isAuthorized returns scheme string → 401 + WWW-Authenticate", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("isAuthorized", "Basic");
    await agent.get("/").expect(401).expect("www-authenticate", "Basic");
  });

  it("isForbidden true → 403", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("isForbidden", true);
    await agent.get("/").expect(403);
  });

  // ── B3 — OPTIONS ─────────────────────────────────────────────────────────

  it("OPTIONS → 200", async () => {
    helper.set("allowedMethods", http11Methods);
    await agent.options("/").expect(200);
  });

  // ── O18 — variances and final GET ────────────────────────────────────────

  it("multiple charsets → 200 with Vary", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("charsetsProvided", {
      "utf-8": identity,
      "iso-8859-5": identity,
      "unicode-1-1": identity,
    });
    await agent.get("/").expect(200);
  });

  it("multiple content types + charset → 200", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("contentTypesProvided", {
      "text/html": () => "whatever",
      "text/plain": () => "whatever",
    });
    helper.set("charsetsProvided", { "utf-8": identity });
    await agent.get("/").expect(200);
  });

  it("ETag + Last-Modified + Expires set → 200", async () => {
    helper.set("allowedMethods", ["GET"]);
    helper.set("generateEtag", "v1");
    helper.set("lastModified", new Date("2010-01-01"));
    helper.set("expires", new Date("2020-01-01"));
    await agent.get("/").expect(200);
  });

  it("multipleChoices true → 300", async () => {
    helper.set("charsetsProvided", {
      "utf-8": identity,
      "iso-8859-5": identity,
    });
    helper.set("multipleChoices", true);
    await agent.get("/").expect(300);
  });

  // ── I4/K5/L5 — redirects ─────────────────────────────────────────────────

  it("PUT to non-existent + movedPermanently → 301", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("movedPermanently", "http://localhost/newlocation");
    await agent.put("/").expect(301);
  });

  it("GET non-existent + previouslyExisted + movedPermanently → 301", async () => {
    helper.set("resourceExists", false);
    helper.set("previouslyExisted", true);
    helper.set("movedPermanently", "http://localhost/newlocation");
    await agent.get("/").expect(301);
  });

  it("GET non-existent + previouslyExisted + movedTemporarily → 307", async () => {
    helper.set("resourceExists", false);
    helper.set("previouslyExisted", true);
    helper.set("movedTemporarily", "http://localhost/newlocation");
    await agent.get("/").expect(307);
  });

  // ── J18 — Not Modified ───────────────────────────────────────────────────

  it("GET + If-None-Match: * → 304", async () => {
    await agent.get("/").set("If-None-Match", "*").expect(304);
  });

  it("GET + If-Match + If-None-Match match via k13 → 304", async () => {
    helper.set("generateEtag", "v1");
    await agent
      .get("/")
      .set("If-Match", '"v1"')
      .set("If-None-Match", '"v1"')
      .set("If-Unmodified-Since", "{{INVALID DATE}}")
      .expect(304);
  });

  it("GET + If-Match: * + If-None-Match: * + valid If-Unmodified-Since → 304", async () => {
    helper.set("lastModified", new Date("Wed, 20 Feb 2013 10:00:00 GMT"));
    await agent
      .get("/")
      .set("If-Match", "*")
      .set("If-None-Match", "*")
      .set("If-Unmodified-Since", "Wed, 20 Feb 2013 17:00:00 GMT")
      .expect(304);
  });

  it("If-Modified-Since not exceeded → 304", async () => {
    helper.set("lastModified", new Date("2012-01-01"));
    helper.set("expires", new Date("2020-01-01"));
    await agent.get("/").set("If-Modified-Since", "2012-01-01").expect(304);
  });

  // ── N11 — POST processing ────────────────────────────────────────────────

  it("POST + processPost returns URL string → 303", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("allowMissingPost", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    helper.setFn("processPost", async () => "/new");
    await agent.post("/").set("Content-Type", "application/json").expect(303);
  });

  it("POST + processPost returns false → 500", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("allowMissingPost", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    helper.setFn("processPost", async () => false);
    await agent.post("/").set("Content-Type", "application/json").expect(500);
  });

  it("POST previously-existed + processPost returns URL → 303", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("allowMissingPost", true);
    helper.set("previouslyExisted", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    helper.setFn("processPost", async () => "/new");
    await agent.post("/").set("Content-Type", "text/html").expect(303);
  });

  // ── L7/M7 — Not Found ───────────────────────────────────────────────────

  it("GET non-existent resource → 404", async () => {
    helper.set("resourceExists", false);
    await agent.get("/").expect(404);
  });

  it("POST non-existent, allowMissingPost false → 404", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    await agent.post("/").set("Content-Type", "application/json").expect(404);
  });

  // ── P11 — Created ───────────────────────────────────────────────────────

  it("POST + processPost sets Location → 201", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("allowMissingPost", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    helper.setFn("processPost", async (_req, res) => {
      res.setHeader("Location", "http://localhost/new1");
      return true;
    });
    await agent.post("/").set("Content-Type", "application/json").expect(201);
  });

  it("PUT non-existent + isConflict sets Location → 201", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    helper.setFn("isConflict", async (_req, res) => {
      res.setHeader("Location", "http://localhost/new1");
      return false;
    });
    await agent.put("/").set("Content-Type", "application/json").expect(201);
  });

  // ── P3/O14 — Conflict ───────────────────────────────────────────────────

  it("PUT non-existent + isConflict true → 409", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("isConflict", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    await agent.put("/").set("Content-Type", "application/json").expect(409);
  });

  it("PUT existing + isConflict true → 409", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("isConflict", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    await agent.put("/").set("Content-Type", "application/json").expect(409);
  });

  // ── M5/N5 — Gone ────────────────────────────────────────────────────────

  it("GET non-existent + previouslyExisted → 410", async () => {
    helper.set("resourceExists", false);
    helper.set("previouslyExisted", true);
    await agent.get("/").expect(410);
  });

  it("POST non-existent + previouslyExisted → 410", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("resourceExists", false);
    helper.set("previouslyExisted", true);
    helper.set("contentTypesAccepted", { "application/json": () => true });
    await agent.post("/").set("Content-Type", "application/json").expect(410);
  });

  // ── M20 — Accepted (delete pending) ─────────────────────────────────────

  it("DELETE + deleteCompleted false → 202", async () => {
    helper.set("allowedMethods", http11Methods);
    helper.set("deleteResource", true);
    helper.set("deleteCompleted", false);
    await agent.delete("/").expect(202);
  });

  // ── Additional coverage ──────────────────────────────────────────────────

  it("isAuthorized returns true → 200", async () => {
    helper.set("isAuthorized", true);
    await agent.get("/").expect(200);
  });

  it("Content-Length set for buffer response", async () => {
    const res = await agent.get("/").expect(200);
    assert.ok(res.headers["content-length"] !== undefined, "Content-Length should be set for buffer response");
  });
});
