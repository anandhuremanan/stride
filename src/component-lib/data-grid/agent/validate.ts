/*
 * Five layers between an intent and anything happening.
 *
 *   1 schema        is this a shape this instance accepts?
 *   2 reference     do the column, option and rows it names exist?
 *   3 coercion      what do its values actually mean?
 *   4 policy        is it allowed, given what the host has forbidden?
 *   5 plausibility  does the result look like what was meant?
 *
 * The layers are run in that order, and a failure stops there — later layers
 * would only produce noise about a command that is already dead. The layer a
 * check belongs to is a property of the check, not of when it runs: a couple
 * of reference and policy checks happen before the schema, because
 * "`email` cannot be filtered" is a better message than "matched no branch",
 * and the schema would only have said the latter.
 *
 * Nothing here executes. The result is a command the executor can run, or a
 * refusal with a reason a person can read.
 */

import { checkSchema, fail, ok, type ValidationIssue, type ValidationResult } from "../../shared/core/agent";
import type { ColumnFilter, GridState } from "../core/types";
import { coerceFilter, nearest, type CoercionNote } from "./coerce";
import type { GridAgentPolicy, GridContractColumn, GridRuntimeContract } from "./contract";
import type { GridDataset } from "./dataset";
import { COLUMN_REQUIREMENT, type GeneratedIntentSchema, type GridIntent } from "./intent";
import { GRID_OPERATIONS, isGridOperation, type GridOperationName } from "./operations";

export interface GridExplanation {
  /** One line a person can read: "Filter Revenue greater than ₹1,00,000". */
  summary: string;
  /** The same thing in the grid's own terms: "revenue > 100000". */
  interpretation: string;
  /** Rows that would be shown afterwards. Null when only the server knows. */
  affectedRows: number | null;
  /** Rows shown now, for comparison. */
  currentRows: number | null;
}

export interface GridCommand {
  operation: GridOperationName;
  /** The intent after coercion — exactly what the executor receives. */
  intent: GridIntent;
  explain: GridExplanation;
}

export interface ValidateContext<T> {
  contract: GridRuntimeContract;
  schema: GeneratedIntentSchema;
  dataset: GridDataset<T>;
  state: GridState;
  policy: GridAgentPolicy;
  locale?: string;
  now?: Date;
}

const issue = (
  layer: ValidationIssue["layer"],
  code: string,
  message: string,
  extra: Partial<ValidationIssue> = {},
): ValidationIssue => ({ layer, code, message, ...extra });

// --------------------------------------------------------------- explanation

const OPERATOR_WORDS: Record<string, string> = {
  contains: "contains",
  notContains: "does not contain",
  equals: "is",
  notEquals: "is not",
  startsWith: "starts with",
  endsWith: "ends with",
  gt: "greater than",
  gte: "at least",
  lt: "less than",
  lte: "at most",
  between: "between",
  before: "before",
  after: "after",
  in: "is one of",
  isEmpty: "is empty",
  isNotEmpty: "is not empty",
};

const isCurrencyCode = (unit: string | undefined): unit is string => /^[A-Z]{3}$/.test(unit ?? "");

function formatValue(column: GridContractColumn, value: unknown, locale?: string): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((item) => formatValue(column, item, locale)).join(", ");
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") {
    if (isCurrencyCode(column.unit)) {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: column.unit,
        maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      }).format(value);
    }
    const text = new Intl.NumberFormat(locale).format(value);
    return column.unit === "%" || column.percentBasis ? `${text}%` : text;
  }
  const option = column.options?.find((entry) => entry.value === value);
  return option ? option.label : String(value);
}

function describe(
  intent: GridIntent,
  contract: GridRuntimeContract,
  locale: string | undefined,
): { summary: string; interpretation: string } {
  const column = (id: string) => contract.columns.find((entry) => entry.id === id);
  const label = (id: string) => column(id)?.label ?? id;

  switch (intent.action) {
    case "search":
      return {
        summary: intent.text === "" ? "Clear the search" : `Search for "${intent.text}"`,
        interpretation: `search = ${JSON.stringify(intent.text)}`,
      };
    case "filter": {
      const col = column(intent.column);
      const word = OPERATOR_WORDS[intent.operator] ?? intent.operator;
      const value = col ? formatValue(col, intent.value, locale) : String(intent.value ?? "");
      const upper = col && intent.value2 !== undefined ? formatValue(col, intent.value2, locale) : "";
      const phrase =
        intent.operator === "between"
          ? `${word} ${value} and ${upper}`
          : intent.operator === "isEmpty" || intent.operator === "isNotEmpty"
            ? word
            : `${word} ${value}`;
      return {
        summary: `Filter ${label(intent.column)} ${phrase}`,
        interpretation: `${intent.column} ${intent.operator} ${JSON.stringify(intent.value ?? null)}${
          intent.value2 !== undefined ? ` .. ${JSON.stringify(intent.value2)}` : ""
        }`,
      };
    }
    case "clearFilters":
      return { summary: "Remove every filter", interpretation: "filters = [], search = \"\"" };
    case "sort":
      return {
        summary: `Sort by ${label(intent.column)}, ${
          intent.direction === "asc" ? "lowest first" : "highest first"
        }${intent.append ? ", keeping the existing sort" : ""}`,
        interpretation: `sort ${intent.column} ${intent.direction}${intent.append ? " (append)" : ""}`,
      };
    case "clearSort":
      return { summary: "Return to the original order", interpretation: "sorting = []" };
    case "selectRows":
      return {
        summary: `${intent.value === false ? "Deselect" : "Select"} ${intent.rowIds.length} row(s)`,
        interpretation: `selectRows ${intent.rowIds.length}`,
      };
    case "selectAll":
      return {
        summary: intent.value === false ? "Clear the selection" : "Select every matching row",
        interpretation: `selectAll ${intent.value !== false}`,
      };
    case "clearSelection":
      return { summary: "Clear the selection", interpretation: "rowSelection = {}" };
    case "setColumnVisibility":
      return {
        summary: `${intent.visible ? "Show" : "Hide"} ${label(intent.column)}`,
        interpretation: `columnVisibility.${intent.column} = ${intent.visible}`,
      };
    case "pinColumn":
      return {
        summary: intent.side ? `Pin ${label(intent.column)} to the ${intent.side}` : `Unpin ${label(intent.column)}`,
        interpretation: `pin ${intent.column} ${intent.side ?? "none"}`,
      };
    case "moveColumn":
      return {
        summary: `Move ${label(intent.column)} ${intent.placement} ${label(intent.target)}`,
        interpretation: `move ${intent.column} ${intent.placement} ${intent.target}`,
      };
    case "setColumnWidth":
      return {
        summary:
          intent.width === null
            ? `Restore ${label(intent.column)} to its default width`
            : `Set ${label(intent.column)} to ${intent.width}px`,
        interpretation: `width ${intent.column} = ${intent.width ?? "default"}`,
      };
    case "resetColumns":
      return { summary: "Restore the default columns", interpretation: "resetColumns" };
    case "setPage":
      return { summary: `Go to page ${intent.index + 1}`, interpretation: `page = ${intent.index}` };
    case "setPageSize":
      return { summary: `Show ${intent.size} rows per page`, interpretation: `pageSize = ${intent.size}` };
    case "setDensity":
      return { summary: `Use ${intent.density} rows`, interpretation: `density = ${intent.density}` };
    case "export":
      return {
        summary: `Export the ${intent.scope ?? "filtered"} rows as ${intent.format.toUpperCase()}`,
        interpretation: `export ${intent.format} ${intent.scope ?? "filtered"}`,
      };
    case "print":
      return {
        summary: `Print the ${intent.scope ?? "filtered"} rows`,
        interpretation: `print ${intent.scope ?? "filtered"}`,
      };
    case "copy":
      return { summary: "Copy the selected rows", interpretation: "copy" };
    case "undo":
      return { summary: "Undo the last change", interpretation: "undo" };
    case "redo":
      return { summary: "Redo the last undone change", interpretation: "redo" };
  }
}

// ------------------------------------------------------------- dry-run query

/**
 * What the query would be after this intent. Only three operations change
 * which rows are shown, so this is a projection rather than a second
 * implementation of the grid's state machine.
 */
export function projectQuery(
  current: { filters: readonly ColumnFilter[]; globalFilter: string },
  intent: GridIntent,
): { filters: ColumnFilter[]; globalFilter: string } {
  const filters = [...current.filters];
  switch (intent.action) {
    case "filter": {
      const rest = filters.filter((entry) => entry.columnId !== intent.column);
      rest.push({
        columnId: intent.column,
        operator: intent.operator,
        ...(intent.value !== undefined ? { value: intent.value } : {}),
        ...(intent.value2 !== undefined ? { value2: intent.value2 } : {}),
      });
      return { filters: rest, globalFilter: current.globalFilter };
    }
    case "clearFilters":
      return { filters: [], globalFilter: "" };
    case "search":
      return { filters, globalFilter: intent.text };
    default:
      return { filters, globalFilter: current.globalFilter };
  }
}

// ------------------------------------------------------------------ validate

const EXPORT_SCOPES = ["filtered", "all", "selected", "page"] as const;

export function validateIntent<T>(raw: unknown, context: ValidateContext<T>): ValidationResult<GridCommand> {
  const { contract, schema, dataset, state, policy, locale, now } = context;
  const warnings: ValidationIssue[] = [];

  // ----------------------------------------------------------------- layer 1
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail(issue("schema", "not-an-object", "An intent must be a JSON object."));
  }
  const input = raw as Record<string, unknown>;
  const action = input.action;
  if (typeof action !== "string") {
    return fail(issue("schema", "missing-action", 'An intent needs a string "action".', { path: "action" }));
  }
  if (!isGridOperation(action)) {
    const guess = nearest(action, contract.operations);
    return fail(
      issue("schema", "unknown-operation", `"${action}" is not an operation this component has.`, {
        path: "action",
        ...(guess ? { suggestion: `Did you mean "${guess}"?` } : {}),
      }),
    );
  }
  if (!contract.operations.includes(action)) {
    const denied = policy.denyOperations?.includes(action) === true;
    return fail(
      issue(
        denied ? "policy" : "reference",
        denied ? "operation-denied" : "operation-unavailable",
        denied
          ? `"${action}" has been disabled for this grid.`
          : `"${action}" is not available: this grid has the feature turned off.`,
        { path: "action" },
      ),
    );
  }

  // --------------------------------------------- layer 2/4: column triage
  const columnField = COLUMN_REQUIREMENT[action];
  let column: GridContractColumn | undefined;
  if (columnField) {
    const id = input.column;
    if (typeof id !== "string") {
      return fail(issue("schema", "missing-column", '"column" is required and must be a string.', { path: "column" }));
    }
    column = contract.columns.find((entry) => entry.id === id);
    if (!column) {
      const guess = nearest(
        id,
        contract.columns.flatMap((entry) => [entry.id, entry.label, ...(entry.synonyms ?? [])]),
      );
      const resolved = guess && contract.columns.find((entry) => entry.id === guess || entry.label === guess || entry.synonyms?.includes(guess));
      return fail(
        issue("reference", "unknown-column", `There is no column "${id}".`, {
          path: "column",
          ...(resolved ? { suggestion: `Did you mean "${resolved.id}"?` } : {}),
        }),
      );
    }
    if (!column[columnField]) {
      return fail(
        issue("policy", `not-${columnField}`, `${column.label} cannot be ${PARTICIPLE[columnField]}.`, {
          path: "column",
          ...(column.restricted
            ? { suggestion: "This column has been restricted by the application." }
            : {}),
        }),
      );
    }
  }

  // ------------------------------------------------- layer 1: generated schema
  const branch = schema.byAction.get(action);
  if (branch) {
    const problems = checkSchema(input, branch);
    if (problems.length > 0) {
      const first = problems[0];
      return fail(
        issue("schema", first.code, `${first.path || "intent"}: ${first.message}`, { path: first.path }),
        problems.map((p) => issue("schema", p.code, `${p.path || "intent"}: ${p.message}`, { path: p.path })),
      );
    }
  }

  // The schema has now proved the shape; from here the intent is typed.
  let intent = { ...input } as GridIntent;

  // --------------------------------------------- layers 2 and 3: references
  if (intent.action === "filter" && column) {
    const coerced = coerceFilter(column, intent.operator, intent.value, intent.value2, { now });
    if (!coerced.ok) {
      return fail(
        issue(coerced.code === "unknown-option" ? "reference" : "coercion", coerced.code, coerced.message, {
          path: "value",
          ...(coerced.suggestion ? { suggestion: coerced.suggestion } : {}),
        }),
      );
    }
    if (
      coerced.value === undefined &&
      intent.operator !== "isEmpty" &&
      intent.operator !== "isNotEmpty"
    ) {
      return fail(
        issue("reference", "missing-value", `"${intent.operator}" needs a value.`, { path: "value" }),
      );
    }
    if (intent.operator === "between" && coerced.value2 === undefined) {
      return fail(
        issue("reference", "missing-value2", '"between" needs an upper bound in "value2".', { path: "value2" }),
      );
    }
    pushNotes(warnings, coerced.notes);
    intent = {
      action: "filter",
      column: intent.column,
      operator: coerced.operator,
      ...(coerced.value !== undefined ? { value: coerced.value } : {}),
      ...(coerced.value2 !== undefined ? { value2: coerced.value2 } : {}),
    };
  }

  if (intent.action === "moveColumn") {
    if (intent.target === intent.column) {
      return fail(issue("reference", "same-column", "A column cannot be moved relative to itself.", { path: "target" }));
    }
  }

  if (intent.action === "selectRows") {
    const missing = intent.rowIds.filter((id) => !dataset.hasRowId(id));
    if (missing.length > 0) {
      return fail(
        issue(
          "reference",
          "unknown-rows",
          `${missing.length} of ${intent.rowIds.length} row id(s) are not in the grid: ${missing
            .slice(0, 3)
            .join(", ")}${missing.length > 3 ? "…" : ""}.`,
          { path: "rowIds" },
        ),
      );
    }
    const cap = policy.maxSelectRows ?? 1000;
    if (intent.rowIds.length > cap) {
      return fail(
        issue("policy", "too-many-rows", `A single selection may name at most ${cap} rows.`, { path: "rowIds" }),
      );
    }
  }

  // ------------------------------------------------------------ layer 4: policy
  if (intent.action === "search" && intent.text !== "") {
    /*
     * The global search is not column-scoped: the grid matches it against
     * every column whose definition says `searchable`. Policy here cannot
     * narrow that, because there is no per-search API to narrow. Say so
     * rather than implying an enforcement that does not exist — the real fix
     * is `searchable: false` on the column definition.
     */
    const exposed = contract.columns.filter((entry) => entry.restricted);
    if (exposed.length > 0) {
      warnings.push(
        issue(
          "policy",
          "search-covers-restricted",
          `A global search also matches ${exposed
            .map((entry) => entry.label)
            .join(", ")}, which policy restricts. Set \`searchable: false\` on those columns to stop it.`,
        ),
      );
    }
  }

  if (intent.action === "export" || intent.action === "print") {
    const scope = intent.scope ?? "filtered";
    if (!EXPORT_SCOPES.includes(scope)) {
      return fail(issue("schema", "bad-scope", `"${scope}" is not a row scope.`, { path: "scope" }));
    }
    if (scope === "selected" && contract.stats.selectedRows === 0) {
      return fail(
        issue("reference", "nothing-selected", "No rows are selected, so there is nothing to export.", {
          path: "scope",
          suggestion: 'Select rows first, or use scope "filtered".',
        }),
      );
    }
    const unexportable = contract.columns.filter((entry) => entry.restricted);
    if (unexportable.length > 0) {
      warnings.push(
        issue(
          "policy",
          "columns-withheld",
          `${unexportable.map((entry) => entry.label).join(", ")} will not be included.`,
        ),
      );
    }
  }

  // -------------------------------------------------------- layer 5: plausibility
  const currentRows = contract.stats.filteredRows;
  let affectedRows = currentRows;
  let confirm: { code: string; message: string } | null = null;

  if (intent.action === "filter" || intent.action === "search" || intent.action === "clearFilters") {
    const projected = projectQuery({ filters: state.filters, globalFilter: state.globalFilter }, intent);
    affectedRows = dataset.count(projected.filters, projected.globalFilter);

    if (affectedRows !== null && policy.warnOnEmptyResult !== false && affectedRows === 0) {
      warnings.push(
        issue("plausibility", "empty-result", "Nothing matches, so the grid would be empty.", {
          suggestion: "Loosen the filter, or check the value.",
        }),
      );
    }
    if (
      affectedRows !== null &&
      currentRows !== null &&
      intent.action === "filter" &&
      affectedRows === currentRows &&
      affectedRows > 0
    ) {
      warnings.push(
        issue("plausibility", "no-op", "Every row already shown matches, so nothing would change."),
      );
    }
    if (
      affectedRows !== null &&
      dataset.total !== null &&
      intent.action === "filter" &&
      dataset.total > 0 &&
      affectedRows >= dataset.total * 0.95 &&
      affectedRows < dataset.total
    ) {
      warnings.push(
        issue("plausibility", "barely-narrows", `This keeps ${affectedRows} of ${dataset.total} rows.`),
      );
    }
  }

  if (intent.action === "export") {
    const rows = exportRowCount(intent.scope ?? "filtered", contract, dataset);
    affectedRows = rows;
    const max = policy.maxExportRows;
    if (max !== undefined && rows !== null && rows > max) {
      return fail(
        issue("policy", "export-too-large", `Exports are limited to ${max} rows; this one is ${rows}.`, {
          suggestion: "Filter further, or export the current page.",
        }),
      );
    }
    if (rows === 0) {
      return fail(issue("plausibility", "empty-export", "There are no rows to export."));
    }
    const threshold = policy.confirmExportRows ?? 5000;
    if (rows !== null && rows > threshold) {
      confirm = { code: "large-export", message: `This exports ${rows} rows. Continue?` };
    }
  }

  const definition = GRID_OPERATIONS[intent.action];
  if (confirm === null && definition.requiresConfirmation) {
    confirm = { code: "irreversible", message: `${describe(intent, contract, locale).summary}. This cannot be undone.` };
  }

  if (intent.action === "undo" && !contract.state.canUndo) {
    return fail(issue("reference", "nothing-to-undo", "There is nothing to undo."));
  }
  if (intent.action === "redo" && !contract.state.canRedo) {
    return fail(issue("reference", "nothing-to-redo", "There is nothing to redo."));
  }

  const { summary, interpretation } = describe(intent, contract, locale);
  return ok<GridCommand>(
    {
      operation: intent.action,
      intent,
      explain: { summary, interpretation, affectedRows, currentRows },
    },
    warnings,
    confirm,
  );
}

const PARTICIPLE: Record<string, string> = {
  filterable: "filtered",
  sortable: "sorted",
  hideable: "hidden or shown",
  pinnable: "pinned",
  reorderable: "moved",
  resizable: "resized",
};

function pushNotes(warnings: ValidationIssue[], notes: CoercionNote[]): void {
  for (const note of notes) warnings.push(issue("coercion", note.code, note.message));
}

function exportRowCount<T>(
  scope: string,
  contract: GridRuntimeContract,
  dataset: GridDataset<T>,
): number | null {
  switch (scope) {
    case "all":
      return dataset.total;
    case "selected":
      return contract.stats.selectedRows;
    case "page":
      return contract.stats.pageRows;
    default:
      return contract.stats.filteredRows;
  }
}

/**
 * Validates a list of intents as one unit.
 *
 * The plausibility layer sees them together: "customers in Kerala with revenue
 * over 1 lakh" is two filters, and the useful number is how many rows survive
 * both, not how many survive each.
 */
export function validateBatch<T>(
  raws: readonly unknown[],
  context: ValidateContext<T>,
): ValidationResult<GridCommand[]> {
  if (raws.length === 0) {
    return fail(issue("schema", "empty-batch", "There is nothing to do."));
  }

  const columnsFiltered = new Set<string>();
  for (const raw of raws) {
    const entry = raw as { action?: string; column?: string };
    if (entry?.action !== "filter" || typeof entry.column !== "string") continue;
    if (columnsFiltered.has(entry.column)) {
      /*
       * The grid holds one filter per column, so the second would replace the
       * first and the caller would get half of what they asked for without
       * being told. "Mumbai or Pune" is the usual way to arrive here, and the
       * honest answer is that this grid cannot express it.
       */
      return fail(
        issue(
          "reference",
          "duplicate-column-filter",
          `Two filters were asked for on "${entry.column}", and a column holds only one.`,
          {
            suggestion:
              "Use a single filter with a range or a list, or filter on a different column.",
          },
        ),
      );
    }
    columnsFiltered.add(entry.column);
  }

  const commands: GridCommand[] = [];
  const warnings: ValidationIssue[] = [];
  let confirm: { code: string; message: string } | null = null;
  let query = { filters: context.state.filters as readonly ColumnFilter[], globalFilter: context.state.globalFilter };

  for (const raw of raws) {
    const scoped: ValidateContext<T> = {
      ...context,
      state: { ...context.state, filters: [...query.filters], globalFilter: query.globalFilter },
      contract: {
        ...context.contract,
        stats: {
          ...context.contract.stats,
          filteredRows: context.dataset.count(query.filters, query.globalFilter),
        },
      },
    };
    const result = validateIntent(raw, scoped);
    if (!result.ok) return result;
    commands.push(result.command);
    warnings.push(...result.warnings);
    confirm ??= result.confirm;
    query = projectQuery(query, result.command.intent);
  }

  // The last command's count is the count for the batch as a whole.
  const affectedRows = context.dataset.count(query.filters, query.globalFilter);
  for (const command of commands) command.explain.affectedRows = affectedRows;

  return ok(commands, warnings, confirm);
}
