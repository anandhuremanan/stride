/*
 * The intent schema, generated per instance.
 *
 * A hand-written GridIntent schema would say "operator is one of sixteen
 * strings" and leave `startsWith` on a revenue column perfectly legal. The
 * generated one carries a branch per filterable column, each with the operator
 * set that column's type actually supports, so the illegal pair cannot be
 * expressed — not merely rejected afterwards. Feed it to a constrained decoder
 * and a model is physically unable to emit it; feed it to the validator and
 * the same rule is enforced a second time, because a schema that only lives
 * in the decoder is a schema you are trusting someone else to run.
 *
 * What is strict and what is not:
 *
 *   strict        action names, column ids, operator sets per column,
 *                 export formats, densities, placements, page bounds
 *   permissive    the *values* people write — "1 lakh", "20%", "kerala"
 *
 * Values stay loose here on purpose. Narrowing them in the schema would reject
 * the input before the coercion layer had a chance to read it, and coercion is
 * where "1 lakh" becomes 100000 deterministically instead of a model guessing.
 */

import type { Density, ExportScope, FilterOperator, FilterValue, RowId } from "../core/types";
import type { JsonSchema } from "../../shared/core/agent";
import type { GridRuntimeContract } from "./contract";
import type { GridOperationName } from "./operations";

export type GridIntent =
  | { action: "search"; text: string }
  | {
      action: "filter";
      column: string;
      operator: FilterOperator;
      value?: FilterValue;
      value2?: FilterValue;
    }
  | { action: "clearFilters" }
  | { action: "sort"; column: string; direction: "asc" | "desc"; append?: boolean }
  | { action: "clearSort" }
  | { action: "selectRows"; rowIds: RowId[]; value?: boolean }
  | { action: "selectAll"; value?: boolean }
  | { action: "clearSelection" }
  | { action: "setColumnVisibility"; column: string; visible: boolean }
  | { action: "pinColumn"; column: string; side: "left" | "right" | null }
  | { action: "moveColumn"; column: string; target: string; placement: "before" | "after" }
  | { action: "setColumnWidth"; column: string; width: number | null }
  | { action: "resetColumns" }
  | { action: "setPage"; index: number }
  | { action: "setPageSize"; size: number }
  | { action: "setDensity"; density: Density }
  | { action: "export"; format: "csv" | "excel" | "pdf"; scope?: ExportScope; fileName?: string }
  | { action: "print"; scope?: ExportScope; title?: string }
  | { action: "copy" }
  | { action: "undo" }
  | { action: "redo" };

/** Which column flag an action needs, so a refusal can say why. */
export const COLUMN_REQUIREMENT: Partial<
  Record<GridOperationName, "filterable" | "sortable" | "hideable" | "pinnable" | "reorderable" | "resizable">
> = {
  filter: "filterable",
  sort: "sortable",
  setColumnVisibility: "hideable",
  pinColumn: "pinnable",
  moveColumn: "reorderable",
  setColumnWidth: "resizable",
};

export interface GeneratedIntentSchema {
  /** The whole union. Hand this to a constrained decoder. */
  schema: JsonSchema;
  /** One entry per action, for targeted error messages. */
  byAction: Map<GridOperationName, JsonSchema>;
}

const ANY_VALUE: JsonSchema = {
  anyOf: [
    { type: "string" },
    { type: "number" },
    { type: "boolean" },
    { type: "null" },
    { type: "array", items: { type: ["string", "number"] } },
  ],
};

const SCOPE = (): JsonSchema => ({ enum: ["filtered", "all", "selected", "page"] });

const branch = (
  action: GridOperationName,
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
  description?: string,
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  ...(description ? { description } : {}),
  required: ["action", ...required],
  properties: { action: { const: action }, ...properties },
});

/**
 * Builds the intent schema for one live contract.
 *
 * Deterministic: the only inputs are the contract's columns, capabilities and
 * page count, and they are walked in order. The same contract always produces
 * byte-identical JSON.
 */
export function buildIntentSchema(contract: GridRuntimeContract): GeneratedIntentSchema {
  const has = new Set(contract.operations);
  const byAction = new Map<GridOperationName, JsonSchema>();
  const ids = (predicate: (column: GridRuntimeContract["columns"][number]) => boolean) =>
    contract.columns.filter(predicate).map((column) => column.id);

  const add = (action: GridOperationName, schema: JsonSchema | JsonSchema[]) => {
    if (!has.has(action)) return;
    const list = Array.isArray(schema) ? schema : [schema];
    if (list.length === 0) return;
    byAction.set(action, list.length === 1 ? list[0] : { oneOf: list });
  };

  add("search", branch("search", { text: { type: "string", maxLength: 200 } }, ["text"]));

  // One branch per filterable column: this is what couples operator to type.
  add(
    "filter",
    contract.columns
      .filter((column) => column.filterable && column.operators.length > 0)
      .map((column) =>
        branch(
          "filter",
          {
            column: { const: column.id },
            operator: { enum: column.operators as FilterOperator[] },
            value: ANY_VALUE,
            value2: ANY_VALUE,
          },
          ["column", "operator"],
          column.description ?? `Filter ${column.label}${column.unit ? ` (${column.unit})` : ""}.`,
        ),
      ),
  );

  add("clearFilters", branch("clearFilters"));

  add(
    "sort",
    branch(
      "sort",
      {
        column: { enum: ids((column) => column.sortable) },
        direction: { enum: ["asc", "desc"] },
        append: { type: "boolean" },
      },
      ["column", "direction"],
    ),
  );
  add("clearSort", branch("clearSort"));

  add(
    "selectRows",
    branch(
      "selectRows",
      {
        rowIds: { type: "array", items: { type: "string" }, minItems: 1 },
        value: { type: "boolean" },
      },
      ["rowIds"],
    ),
  );
  add("selectAll", branch("selectAll", { value: { type: "boolean" } }));
  add("clearSelection", branch("clearSelection"));

  add(
    "setColumnVisibility",
    branch(
      "setColumnVisibility",
      { column: { enum: ids((column) => column.hideable) }, visible: { type: "boolean" } },
      ["column", "visible"],
    ),
  );
  add(
    "pinColumn",
    branch(
      "pinColumn",
      { column: { enum: ids((column) => column.pinnable) }, side: { enum: ["left", "right", null] } },
      ["column", "side"],
    ),
  );
  add(
    "moveColumn",
    branch(
      "moveColumn",
      {
        column: { enum: ids((column) => column.reorderable) },
        target: { enum: ids(() => true) },
        placement: { enum: ["before", "after"] },
      },
      ["column", "target", "placement"],
    ),
  );
  add(
    "setColumnWidth",
    branch(
      "setColumnWidth",
      {
        column: { enum: ids((column) => column.resizable) },
        width: { type: ["integer", "null"], minimum: 1, maximum: 2000 },
      },
      ["column", "width"],
    ),
  );
  add("resetColumns", branch("resetColumns"));

  add(
    "setPage",
    branch(
      "setPage",
      { index: { type: "integer", minimum: 0, maximum: Math.max(0, contract.state.page.count - 1) } },
      ["index"],
    ),
  );
  add("setPageSize", branch("setPageSize", { size: { type: "integer", minimum: 1, maximum: 1000 } }, ["size"]));
  add(
    "setDensity",
    branch("setDensity", { density: { enum: ["compact", "standard", "comfortable"] } }, ["density"]),
  );

  add(
    "export",
    branch(
      "export",
      {
        format: { enum: [...contract.capabilities.exportFormats] },
        scope: SCOPE(),
        fileName: { type: "string", maxLength: 120 },
      },
      ["format"],
    ),
  );
  add("print", branch("print", { scope: SCOPE(), title: { type: "string", maxLength: 120 } }));
  add("copy", branch("copy"));
  add("undo", branch("undo"));
  add("redo", branch("redo"));

  return {
    schema: {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: `GridIntent (${contract.instanceId})`,
      description:
        "One operation on this DataGrid instance. Column ids, operators and formats are " +
        "fixed to what this instance supports; values are read by the validator's coercion layer.",
      oneOf: [...byAction.values()].flatMap((entry) => (entry.oneOf ? [...entry.oneOf] : [entry])),
    },
    byAction,
  };
}

/* ------------------------------------------------------------- the envelope */

/**
 * What a producer of intents — a model, a form, a macro recorder — is allowed
 * to answer with.
 *
 * Three outcomes, not one. A producer that can only return a command has no
 * way to say "that is ambiguous" or "this grid cannot do that", so it will
 * guess, and a confident wrong filter is the failure mode the whole validator
 * exists to prevent. Making refusal and clarification *first-class answers*
 * rather than error paths is what lets them be measured — and rewarded.
 */
export type GridResponse =
  | { result: "command"; intents: GridIntent[] }
  | { result: "clarify"; question: string; options?: string[] }
  | { result: "declined"; reason: string };

/**
 * The schema a producer is held to, including the two non-command answers.
 *
 * Clarifying and declining are validated like anything else: a `clarify` with
 * no question is not a clarification, it is malformed output wearing a label.
 */
export function buildResponseSchema(contract: GridRuntimeContract): JsonSchema {
  const { schema: intent } = buildIntentSchema(contract);
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: `GridResponse (${contract.instanceId})`,
    description:
      "Answer with a command when the request maps onto this grid, clarify when more " +
      "than one reading is defensible, and decline when this grid cannot do it.",
    oneOf: [
      {
        type: "object",
        additionalProperties: false,
        required: ["result", "intents"],
        description: "One or more operations to apply, in order.",
        properties: {
          result: { const: "command" },
          intents: { type: "array", minItems: 1, maxItems: 8, items: intent },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["result", "question"],
        description: "The request has more than one defensible reading on this grid.",
        properties: {
          result: { const: "clarify" },
          question: { type: "string", minLength: 8, maxLength: 300 },
          options: { type: "array", maxItems: 5, items: { type: "string", maxLength: 120 } },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        required: ["result", "reason"],
        description: "This grid cannot do what was asked.",
        properties: {
          result: { const: "declined" },
          reason: { type: "string", minLength: 4, maxLength: 300 },
        },
      },
    ],
  };
}
