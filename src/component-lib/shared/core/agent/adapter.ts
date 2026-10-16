/*
 * The socket a natural-language producer plugs into.
 *
 * One function. Given what a person typed and everything this component
 * instance can do, return the response envelope a producer is held to:
 *
 *   { "result": "command",  "intents": [ … ] }
 *   { "result": "clarify",  "question": "…" }
 *   { "result": "declined", "reason": "…" }
 *
 * What is deliberately absent is any mention of a model, a vendor, a key or a
 * network. An adapter may call an API, run a model in a worker, apply rules, or
 * return a canned answer in a test. The library ships none of those and
 * depends on none of them — a host supplies one, or the feature is simply not
 * there.
 *
 * The adapter's answer is untrusted. It goes to `agent.respond()`, which
 * validates the envelope through the same five layers a form would face, and
 * nothing reaches the component until that passes. A broken or hostile adapter
 * can propose; it cannot act.
 */

import type { JsonSchema } from "./types";

export interface AgentProposalRequest {
  /** What the person typed, unmodified. */
  utterance: string;
  /**
   * What this instance can do right now: columns, operators, options, current
   * state, policy. The shape is the component's runtime contract.
   */
  contract: unknown;
  /** The schema the answer is held to. Hand this to a constrained decoder. */
  responseSchema: JsonSchema;
  /** Aborted when the person types again or the component unmounts. */
  signal?: AbortSignal;
}

/**
 * Returns the raw envelope. Parsing is the adapter's job; validating is not.
 *
 * Throwing is a legitimate outcome — a network failure, a refused key — and is
 * reported to the person as a failure to reach the producer, which is a
 * different thing from the producer refusing the request.
 */
export type AgentAdapter = (request: AgentProposalRequest) => Promise<unknown>;

/** What a UI needs to show while and after a request runs. */
export type AskPhase = "idle" | "thinking" | "done" | "clarify" | "refused" | "error";

export interface AskOutcome {
  phase: AskPhase;
  /** What to show the person: an explanation, a question, or a reason. */
  message: string;
  /** The validator's stable code, when it refused. */
  code?: string;
  /** Which of the five layers refused it. */
  layer?: string;
  /** A better column or value, when the validator could suggest one. */
  suggestion?: string;
  /** Coercion notes worth surfacing: `Read "1 crore" as 10000000`. */
  warnings?: readonly string[];
  /** The envelope exactly as the adapter returned it, for a debug panel. */
  raw?: unknown;
}
