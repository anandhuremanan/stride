/*
 * WebMCP projection: exposing an already-validated command boundary to
 * whatever agent is driving the browser.
 *
 * This is an adapter and nothing else. It owns no schema, no semantics and no
 * execution path. The chain stays:
 *
 *   component source → passport → runtime contract → intent schema
 *     → [this file] → the component's validator → its executors → the component
 *
 * Nothing here knows about a grid. A component's agent satisfies
 * `ProjectableAgent` structurally, and everything component-specific arrives
 * through `describe` and `summarise`.
 *
 * Why one tool and not one per operation: the operation list is not the
 * agent's interface — the generated intent schema is, because that is where
 * the contract and the validation layers already meet. Twenty-one operations
 * exposed separately would be twenty-one schemas to keep in step with a
 * contract that already describes itself.
 *
 * Surface notes, each of which cost a wrong run to learn:
 *
 *   - It is `document.modelContext`. `navigator.modelContext` was the early
 *     spelling and is deprecated since Chromium 150.
 *   - Chrome hands `inputSchema` to the agent as a JSON *string*, and returns
 *     a tool result as a JSON string. That is the browser's wire format, not
 *     something to pre-serialise here.
 *   - It needs `--enable-features=WebMCPTesting`, the
 *     `chrome://flags/#enable-webmcp-testing` flag, or an origin-trial token.
 *
 * The specification is a Draft Community Group Report and is not on the W3C
 * standards track, so this module is deliberately small and replaceable.
 */

import type { ConfirmRequest, JsonSchema, ValidationIssue, ValidationLayer } from "./types";

// ----------------------------------------------------------- browser surface

/** One command the validator accepted, in the form this projection reports. */
export interface ProjectedCommand {
  readonly intent: unknown;
  readonly explain: { readonly summary: string };
}

/**
 * What the validator answers. Mirrors the component-level execution result;
 * a component may carry extra fields, which are ignored here.
 */
export type ProjectedOutcome =
  | { status: "done"; commands: readonly ProjectedCommand[]; warnings: readonly ValidationIssue[] }
  | {
      status: "needs-confirmation";
      commands: readonly ProjectedCommand[];
      warnings: readonly ValidationIssue[];
      confirm: ConfirmRequest;
    }
  | {
      status: "rejected";
      reason: string;
      code: string;
      layer: ValidationLayer;
      suggestion?: string;
    }
  | { status: "clarify"; question: string; options?: readonly string[] }
  | { status: "declined"; reason: string };

/**
 * The part of a component's agent this projection uses.
 *
 * Structural on purpose: a DataGrid agent, a DatePicker agent or a test double
 * satisfies it without importing anything from here.
 */
export interface ProjectableAgent {
  /** The generated per-instance schema for one intent. */
  schema(): JsonSchema;
  /** Validate without changing anything. */
  validate(intent: unknown): ProjectedOutcome;
  execute(intent: unknown, options?: { confirm?: boolean }): Promise<ProjectedOutcome>;
}

/** The slice of the WebMCP surface this projection touches. */
export interface ModelContext {
  registerTool(descriptor: {
    name: string;
    description: string;
    inputSchema: unknown;
    execute(input: unknown): Promise<unknown>;
  }): void | Promise<void>;
  getTools?(): unknown;
  executeTool?(tool: unknown, input: unknown): Promise<unknown>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

// -------------------------------------------------------------------- result

/** What the agent gets back, before the MCP content envelope is put round it. */
export interface ToolResultPayload extends Record<string, unknown> {
  ok: boolean;
  status: string;
  message: string;
}

export interface ToolCallLog {
  readonly input: unknown;
  readonly result: ToolResultPayload;
}

export interface RegistrationResult {
  registered: boolean;
  toolName: string;
  /** Why not, when `registered` is false. Safe to show a developer. */
  reason?: string;
  /** The schema handed to the agent, for inspection in a test or a UI. */
  inputSchema?: JsonSchema;
}

export interface RegisterAgentToolOptions<TAgent extends ProjectableAgent> {
  /** The tool name the agent sees. One per page. */
  name: string;
  /** Natural-language description, built from the live contract. */
  describe: (agent: TAgent) => string;
  /** Extra fields merged into a successful result — row counts, undo state. */
  summarise?: (agent: TAgent) => Record<string, unknown>;
  /** How many operations may be sent in one call. Default 8. */
  maxIntents?: number;
  /** Description for the `intents` array itself. */
  intentsDescription?: string;
  /** Observe every call, for a UI log or a test. Must not throw. */
  onCall?: (entry: ToolCallLog) => void;
  /**
   * Where to register. Defaults to `document.modelContext`. Supplying one is
   * for tests and for hosts that polyfill the surface elsewhere.
   */
  modelContext?: ModelContext;
}

const UNAVAILABLE =
  "document.modelContext is unavailable. Chrome needs --enable-features=WebMCPTesting, " +
  "the chrome://flags/#enable-webmcp-testing flag, or an origin-trial token.";

/**
 * Whether this page can register WebMCP tools at all.
 *
 * Guards `document` rather than assuming it: this module is imported by code
 * that also runs during server rendering, where touching `document` throws.
 */
export function webmcpAvailable(modelContext?: ModelContext): boolean {
  const target = modelContext ?? (typeof document === "undefined" ? undefined : document.modelContext);
  return typeof target?.registerTool === "function";
}

/**
 * The tool's input schema, derived from the live contract.
 *
 * Not hand-written. `agent.schema()` is the generated per-instance schema, so
 * a tool registered against a component with different columns, operators or
 * policy advertises different arguments automatically.
 */
export function buildToolInputSchema(
  agent: ProjectableAgent,
  options: { maxIntents?: number; intentsDescription?: string } = {},
): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["intents"],
    properties: {
      intents: {
        type: "array",
        minItems: 1,
        maxItems: options.maxIntents ?? 8,
        description:
          options.intentsDescription ??
          "Operations to apply in order. Several filters on different fields combine with AND.",
        items: agent.schema(),
      },
    },
  };
}

/**
 * Registers one tool, if the browser has WebMCP.
 *
 * `execute` runs the production pipeline and nothing else:
 *
 *   validate  → a refusal is returned as the validator wrote it
 *   confirm   → anything irreversible stops here and asks, rather than running
 *   execute   → only after validation passed
 *
 * There is no repair, no retry, and no path that exists only for WebMCP. An
 * agent sending something the component cannot do gets the same refusal, with
 * the same code and layer, that a form would have got.
 */
export function registerAgentTool<TAgent extends ProjectableAgent>(
  agent: TAgent,
  options: RegisterAgentToolOptions<TAgent>,
): RegistrationResult {
  const modelContext =
    options.modelContext ?? (typeof document === "undefined" ? undefined : document.modelContext);

  if (typeof modelContext?.registerTool !== "function") {
    return { registered: false, toolName: options.name, reason: UNAVAILABLE };
  }

  const inputSchema = buildToolInputSchema(agent, options);

  modelContext.registerTool({
    name: options.name,
    description: options.describe(agent),
    inputSchema,

    async execute(rawInput: unknown) {
      const intents = (rawInput as { intents?: unknown } | null | undefined)?.intents;

      const reply = (payload: ToolResultPayload) => {
        try {
          options.onCall?.({ input: rawInput, result: payload });
        } catch {
          /* A broken observer must not turn a good command into an error. */
        }
        return {
          // MCP's content shape, so an agent reading text gets something useful…
          content: [{ type: "text", text: payload.message }],
          // …and the structured result for anything that wants to inspect it.
          structuredContent: payload,
          isError: payload.ok === false,
        };
      };

      if (!Array.isArray(intents) || intents.length === 0) {
        return reply({
          ok: false,
          status: "rejected",
          code: "missing-intents",
          message: '"intents" must be a non-empty array of operations.',
        });
      }

      /* Layer one of the real pipeline. Nothing has touched the component yet. */
      let checked: ProjectedOutcome;
      try {
        checked = agent.validate(intents);
      } catch (error) {
        return reply({
          ok: false,
          status: "rejected",
          code: "validator-threw",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (checked.status === "rejected") {
        return reply({
          ok: false,
          status: "rejected",
          code: checked.code,
          layer: checked.layer,
          suggestion: checked.suggestion,
          message: checked.reason,
        });
      }

      if (checked.status === "clarify") {
        return reply({
          ok: false,
          status: "clarify",
          message: checked.question,
          options: checked.options,
        });
      }

      if (checked.status === "declined") {
        return reply({ ok: false, status: "declined", message: checked.reason });
      }

      if (checked.status === "needs-confirmation") {
        /*
         * An agent does not get to skip a confirmation a person would see. The
         * component is left untouched and the request is handed back.
         */
        return reply({
          ok: false,
          status: "needs-confirmation",
          code: checked.confirm.code,
          message: checked.confirm.message,
          explain: checked.commands.map((command) => command.explain.summary),
        });
      }

      let run: ProjectedOutcome;
      try {
        run = await agent.execute(intents);
      } catch (error) {
        return reply({
          ok: false,
          status: "failed",
          code: "executor-threw",
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (run.status !== "done") {
        return reply({
          ok: false,
          status: run.status,
          message:
            "reason" in run ? run.reason : "question" in run ? run.question : run.status,
        });
      }

      return reply({
        ok: true,
        status: "done",
        message: run.commands.map((command) => command.explain.summary).join("; "),
        applied: run.commands.map((command) => command.intent),
        warnings: run.warnings.map((warning) => `${warning.code}: ${warning.message}`),
        ...(options.summarise?.(agent) ?? {}),
      });
    },
  });

  return { registered: true, toolName: options.name, inputSchema };
}
