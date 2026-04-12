/**
 * Debug / tracing — two mechanisms, both zero-cost when disabled.
 *
 * 1. diagnostics_channel  — subscribe to 'resource-machine:*' channels to
 *    receive structured events. The hasSubscribers guard means no payload is
 *    constructed unless something is actually listening.  Wire OpenTelemetry,
 *    eBPF, or any other sink yourself.
 *
 * 2. JSON trace files — opt-in per-request via req.enableTrace(dir).
 *    Decision names are collected in-memory during the request and written as
 *    a single async writeFile after the response completes (no blocking I/O
 *    mid-decision).
 */

import { channel } from "node:diagnostics_channel";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RMRequest } from "./request.js";
import type { RMResponse } from "./response.js";

// ─── Channel name constants (export so subscribers can reference them) ────────

export const CHANNEL_REQUEST_START = "resource-machine:request-start";
export const CHANNEL_REQUEST_END = "resource-machine:request-end";
export const CHANNEL_DECISION = "resource-machine:decision";

// ─── Message types for channel subscribers ────────────────────────────────────

export interface RequestStartMessage {
  requestId: number;
  method: string;
  url: string;
  pathname: string;
}

export interface RequestEndMessage {
  requestId: number;
  statusCode: number;
  decisions: readonly string[];
}

export interface DecisionMessage {
  requestId: number;
  decision: string;
}

// ─── Channel singletons ───────────────────────────────────────────────────────

const chStart = channel(CHANNEL_REQUEST_START);
const chEnd = channel(CHANNEL_REQUEST_END);
const chDecision = channel(CHANNEL_DECISION);

// ─── Notification helpers ─────────────────────────────────────────────────────

export function notifyRequestStart(req: RMRequest): void {
  if (chStart.hasSubscribers) {
    chStart.publish({
      requestId: req.requestId,
      method: req.method ?? "",
      url: req.url ?? "/",
      pathname: req.pathname,
    } satisfies RequestStartMessage);
  }
}

/**
 * Record one decision step. Always pushes to the in-memory decisions array
 * (a single array push — negligible cost). Channel publish only happens when
 * there are active subscribers.
 */
export function notifyDecision(req: RMRequest, decisionName: string): void {
  req._decisionTrace.decisions.push(decisionName);

  if (chDecision.hasSubscribers) {
    chDecision.publish({
      requestId: req.requestId,
      decision: decisionName,
    } satisfies DecisionMessage);
  }
}

/**
 * Notify request completion. Fires the request-end channel and, if trace files
 * are enabled, writes the trace file asynchronously (fire-and-forget — write
 * errors are non-fatal since the response has already been sent).
 */
export function notifyRequestEnd(req: RMRequest, res: RMResponse): void {
  if (chEnd.hasSubscribers) {
    chEnd.publish({
      requestId: req.requestId,
      statusCode: res.statusCode,
      decisions: req._decisionTrace.decisions,
    } satisfies RequestEndMessage);
  }

  if (req._decisionTrace.enabled && req._decisionTrace.traceDirectory) {
    writeTraceFile(req, res).catch(() => {
      // Trace write errors are non-fatal — response already sent.
    });
  }
}

// ─── Trace file writer ────────────────────────────────────────────────────────

async function writeTraceFile(req: RMRequest, res: RMResponse): Promise<void> {
  const dir = req._decisionTrace.traceDirectory!;
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${req.requestId}_${ts}.json`;

  const payload = JSON.stringify(
    {
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      method: req.method ?? "",
      url: req.url ?? "/",
      statusCode: res.statusCode,
      decisions: req._decisionTrace.decisions,
    },
    null,
    2,
  );

  await writeFile(join(dir, fileName), payload, "utf8");
}
