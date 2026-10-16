/*
 * The vocabulary an agent-operable component shares with its callers.
 *
 * Four things are kept apart on purpose, because they change for different
 * reasons and at different times:
 *
 *   OperationDefinition  what a component knows how to do        (static, from the passport)
 *   RuntimeContract      what this instance can do, right now    (per instance, per render)
 *   Intent               what the caller is asking for           (untrusted input)
 *   OperationExecutor    how this instance actually performs it  (per application)
 *
 * The last one is the reason this file exists. An operation must not be
 * welded to an imperative handle: a grid performs `filter` by calling
 * `GridApi.setFilter`, while a controlled component would perform its
 * equivalent by calling the host's `onChange`. Same operation, same schema,
 * different executor. Nothing here mentions either.
 */

// ---------------------------------------------------------------- JSON Schema

/**
 * The slice of JSON Schema this library emits and checks. Deliberately small:
 * it is what a constrained decoder and a validator both need, and no more.
 */
export interface JsonSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type?: JsonSchemaType | readonly JsonSchemaType[];
  const?: unknown;
  enum?: readonly unknown[];
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  oneOf?: readonly JsonSchema[];
  anyOf?: readonly JsonSchema[];
  default?: unknown;
  examples?: readonly unknown[];
}

export type JsonSchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

// ----------------------------------------------------------------- operations

/**
 * One thing a component can be asked to do. This is the static half of the
 * contract and mirrors the component's `passport.json` `operations` block.
 */
export interface OperationDefinition {
  readonly name: string;
  readonly summary: string;
  /** JSON Schema for the operation's input, minus the `action` discriminator. */
  readonly input?: JsonSchema;
  /** Plain-language consequences, for a confirmation prompt. */
  readonly effects?: readonly string[];
  /** Whether undoing it is a matter of restoring the previous state. */
  readonly reversible: boolean;
  /** Leaves the page: downloads, prints, writes to the clipboard. */
  readonly requiresConfirmation?: boolean;
  /**
   * The imperative method that happens to back this operation, when one does.
   * Metadata only — never required. An operation performed through host state
   * has no API method, and that is a normal case, not a gap.
   */
  readonly apiMethod?: string;
}

export interface ExecutionContext<TContract = unknown> {
  readonly contract: TContract;
  /** Report what would happen and change nothing. */
  readonly dryRun: boolean;
  readonly signal?: AbortSignal;
}

/**
 * How one instance performs one operation.
 *
 * Implementations close over whatever they need — an imperative handle, a
 * state setter, a transport — and the rest of the pipeline never learns which.
 */
export interface OperationExecutor<TInput, TContract = unknown, TResult = void> {
  readonly operation: string;
  /** Set only when `execute` really does call that method. */
  readonly apiMethod?: string;
  execute(input: TInput, context: ExecutionContext<TContract>): TResult | Promise<TResult>;
}

/**
 * An executor in a heterogeneous registry. `never` as the input type is sound
 * here: a function taking a specific input is assignable to one taking
 * `never`, so concrete executors slot in without a cast. Callers cast at the
 * point of dispatch, where the validator has already proved the shape.
 */
export type RegisteredExecutor<TContract = unknown> = OperationExecutor<never, TContract, unknown>;

export type ExecutorRegistry<TContract = unknown> = ReadonlyMap<string, RegisteredExecutor<TContract>>;

// ----------------------------------------------------------------- validation

export type ValidationLayer =
  | "schema"
  | "reference"
  | "coercion"
  | "policy"
  | "plausibility";

export interface ValidationIssue {
  layer: ValidationLayer;
  /** Stable, machine-readable. Messages may be reworded; codes may not. */
  code: string;
  message: string;
  /** JSON pointer-ish path into the intent, when the issue has a location. */
  path?: string;
  suggestion?: string;
}

/** Something the caller should see and agree to before the command runs. */
export interface ConfirmRequest {
  code: string;
  message: string;
}

export type ValidationResult<TCommand> =
  | {
      ok: true;
      command: TCommand;
      /** Non-blocking: coercions applied, plausibility notes. */
      warnings: ValidationIssue[];
      confirm: ConfirmRequest | null;
    }
  | {
      ok: false;
      /** The issue that stopped it, flattened for display. */
      reason: string;
      code: string;
      layer: ValidationLayer;
      suggestion?: string;
      issues: ValidationIssue[];
    };

export const ok = <T>(
  command: T,
  warnings: ValidationIssue[] = [],
  confirm: ConfirmRequest | null = null,
): ValidationResult<T> => ({ ok: true, command, warnings, confirm });

export const fail = <T>(issue: ValidationIssue, issues: ValidationIssue[] = []): ValidationResult<T> => ({
  ok: false,
  reason: issue.message,
  code: issue.code,
  layer: issue.layer,
  ...(issue.suggestion ? { suggestion: issue.suggestion } : {}),
  issues: issues.length > 0 ? issues : [issue],
});
