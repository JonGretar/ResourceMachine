/**
 * Programmatic benchmark runner.
 *
 * Runs autocannon against each scenario in sequence and prints labeled results.
 *
 * Usage:
 *   npm run bench          — 10s per route
 *   DURATION=30 npm run bench  — custom duration
 */
import autocannon from "autocannon";

const BASE = process.env.BENCH_URL ?? "http://localhost:3000";
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 100);
const DURATION = Number(process.env.DURATION ?? 10);

interface Scenario {
  title: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

const scenarios: Scenario[] = [
  {
    title: "GET /ping            baseline sync",
    url: `${BASE}/ping`,
  },
  {
    title: "GET /async           baseline async (1 microtask)",
    url: `${BASE}/async`,
  },
  {
    title: "GET /articles/:id    route params",
    url: `${BASE}/articles/42`,
  },
  {
    title: "GET /etag            ETag generation → 200",
    url: `${BASE}/etag`,
  },
  {
    title: "GET /etag            conditional hit → 304",
    url: `${BASE}/etag`,
    headers: { "if-none-match": '"v1"' },
  },
  {
    title: "GET /missing         resource not found → 404",
    url: `${BASE}/missing`,
  },
  {
    title: "POST /submit         body buffering → 204",
    url: `${BASE}/submit`,
    method: "POST",
    body: '{"x":1}',
    headers: { "content-type": "application/json" },
  },
];

function runScenario(s: Scenario): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    const instance = autocannon({
      title: s.title,
      url: s.url,
      method: (s.method ?? "GET") as autocannon.HTTPMethod,
      headers: s.headers,
      body: s.body,
      connections: CONNECTIONS,
      duration: DURATION,
    });
    autocannon.track(instance);
    instance.on("done", resolve);
    instance.on("error", reject);
  });
}

console.log(`\nResourceMachine benchmark — ${CONNECTIONS} connections, ${DURATION}s per route\n`);

for (const scenario of scenarios) {
  console.log(`\n▶ ${scenario.title}`);
  const result = await runScenario(scenario);
  autocannon.printResult(result);
}
