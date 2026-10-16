"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentAdapter, AskOutcome } from "../core/agent/adapter";
import type { JsonSchema } from "../core/agent/types";

/*
 * One request, end to end: what a person typed goes to the adapter, the
 * adapter's answer goes to the validator, and only a validated command runs.
 *
 * The order is the point. This hook never looks at the answer's contents to
 * decide anything — it hands the envelope to `respond()` and reports what came
 * back. A producer that returns nonsense, a stale schema, or an operation the
 * component does not have is refused by the same five layers a form faces, and
 * the person sees the validator's own words rather than a guess.
 */

/** The part of a component's agent this hook uses. */
export interface AskableAgent {
  contract(): unknown;
  responseSchema(): JsonSchema;
  /** Validates a whole envelope. Does not change anything. */
  respond(response: unknown): AskExecution;
  execute(intent: unknown, options?: { confirm?: boolean }): Promise<AskExecution>;
}

/** The statuses a component's validator and executor answer with. */
export type AskExecution =
  | {
      status: "done";
      commands: readonly { explain: { summary: string } }[];
      warnings: readonly { code: string; message: string }[];
    }
  | {
      status: "needs-confirmation";
      commands: readonly { explain: { summary: string } }[];
      confirm: { code: string; message: string };
    }
  | { status: "rejected"; reason: string; code: string; layer: string; suggestion?: string }
  | { status: "clarify"; question: string; options?: readonly string[] }
  | { status: "declined"; reason: string };

const IDLE: AskOutcome = { phase: "idle", message: "" };

export interface UseAskAgent {
  ask(utterance: string): Promise<void>;
  /** Run a `needs-confirmation` request the person has now agreed to. */
  confirm(): Promise<void>;
  reset(): void;
  outcome: AskOutcome;
  busy: boolean;
  /** Set when the last answer stopped to ask; `confirm()` applies it. */
  pending: unknown;
}

export function useAskAgent(
  agent: AskableAgent | null,
  adapter: AgentAdapter | null,
): UseAskAgent {
  const [outcome, setOutcome] = useState<AskOutcome>(IDLE);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<unknown>(null);

  // One request at a time: typing again abandons the one in flight rather
  // than racing it to the grid.
  const inFlight = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      inFlight.current?.abort();
    };
  }, []);

  const report = useCallback((next: AskOutcome) => {
    if (alive.current) setOutcome(next);
  }, []);

  /** Turn a validator answer into something to show, and run it when allowed. */
  const settle = useCallback(
    async (verdict: AskExecution, intents: unknown, raw: unknown) => {
      if (verdict.status === "rejected") {
        report({
          phase: "refused",
          message: verdict.reason,
          code: verdict.code,
          layer: verdict.layer,
          suggestion: verdict.suggestion,
          raw,
        });
        return;
      }
      if (verdict.status === "clarify") {
        report({ phase: "clarify", message: verdict.question, raw });
        return;
      }
      if (verdict.status === "declined") {
        report({ phase: "refused", message: verdict.reason, raw });
        return;
      }
      if (verdict.status === "needs-confirmation") {
        setPending(intents);
        report({
          phase: "clarify",
          message: verdict.confirm.message,
          code: verdict.confirm.code,
          raw,
        });
        return;
      }

      const run = await agent!.execute(intents);
      if (run.status !== "done") {
        report({
          phase: "refused",
          message: "reason" in run ? run.reason : run.status,
          raw,
        });
        return;
      }
      report({
        phase: "done",
        message: run.commands.map((command) => command.explain.summary).join("; "),
        warnings: run.warnings.map((warning) => `${warning.code}: ${warning.message}`),
        raw,
      });
    },
    [agent, report],
  );

  const ask = useCallback(
    async (utterance: string) => {
      const text = utterance.trim();
      if (!agent || !adapter || text === "") return;

      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setPending(null);
      setBusy(true);
      report({ phase: "thinking", message: "" });

      let raw: unknown;
      try {
        raw = await adapter({
          utterance: text,
          contract: agent.contract(),
          responseSchema: agent.responseSchema(),
          signal: controller.signal,
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          // Reaching the producer failed. That is not the producer refusing,
          // and saying so avoids blaming the person's wording.
          report({
            phase: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
        if (alive.current && inFlight.current === controller) setBusy(false);
        return;
      }

      if (controller.signal.aborted) return;

      try {
        const intents =
          raw && typeof raw === "object" && "intents" in raw
            ? (raw as { intents: unknown }).intents
            : raw;
        await settle(agent.respond(raw), intents, raw);
      } catch (error) {
        report({
          phase: "error",
          message: error instanceof Error ? error.message : String(error),
          raw,
        });
      } finally {
        if (alive.current && inFlight.current === controller) setBusy(false);
      }
    },
    [adapter, agent, report, settle],
  );

  const confirm = useCallback(async () => {
    if (!agent || pending === null) return;
    setBusy(true);
    try {
      // Without the flag the executor stops and asks again, forever.
      const run = await agent.execute(pending, { confirm: true });
      report(
        run.status === "done"
          ? {
              phase: "done",
              message: run.commands.map((command) => command.explain.summary).join("; "),
            }
          : {
              phase: "refused",
              message: "reason" in run ? run.reason : run.status,
            },
      );
      setPending(null);
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [agent, pending, report]);

  const reset = useCallback(() => {
    inFlight.current?.abort();
    setPending(null);
    report(IDLE);
  }, [report]);

  return { ask, confirm, reset, outcome, busy, pending };
}
