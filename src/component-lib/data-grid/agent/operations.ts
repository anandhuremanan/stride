/*
 * What a DataGrid knows how to do.
 *
 * This is the static half of the contract — the same set the component's
 * `passport.json` publishes, kept here in TypeScript so the runtime and the
 * passport cannot drift apart (a test asserts they match). The input schemas
 * are the generic ones; `intent.ts` narrows them against a live instance, so
 * that a filter on a number column cannot even be expressed with `startsWith`.
 *
 * Two rules decide what is in this list:
 *
 *   1. It is backed by something the grid really implements. Grouping and
 *      aggregation are absent because the grid has neither.
 *   2. `apiMethod` is recorded when, and only when, one `GridApi` method
 *      performs it. `export` spans three methods, and `undo`/`redo` are the
 *      agent's own history rather than the grid's — those have none, and that
 *      is normal, not a gap.
 */

import type { JsonSchema, OperationDefinition } from "../../shared/core/agent";

export type GridOperationName =
  | "search"
  | "filter"
  | "clearFilters"
  | "sort"
  | "clearSort"
  | "selectRows"
  | "selectAll"
  | "clearSelection"
  | "setColumnVisibility"
  | "pinColumn"
  | "moveColumn"
  | "setColumnWidth"
  | "resetColumns"
  | "setPage"
  | "setPageSize"
  | "setDensity"
  | "export"
  | "print"
  | "copy"
  | "undo"
  | "redo";

export interface GridOperationDefinition extends OperationDefinition {
  readonly name: GridOperationName;
  /**
   * Which grid feature flag has to be on for this instance to offer it.
   * Undefined means always available.
   */
  readonly requires?:
    | "sorting"
    | "filtering"
    | "selection"
    | "pagination"
    | "columnHiding"
    | "columnPinning"
    | "columnReordering"
    | "columnResizing";
}

const COLUMN: JsonSchema = { type: "string", description: "Column id from the runtime contract." };

const SCOPE: JsonSchema = {
  enum: ["filtered", "all", "selected", "page"],
  default: "filtered",
  description: "Which rows to take. `filtered` is everything matching the current query.",
};

export const GRID_OPERATIONS: Readonly<Record<GridOperationName, GridOperationDefinition>> = {
  search: {
    name: "search",
    summary: "Free-text match across every searchable column.",
    apiMethod: "setGlobalFilter",
    requires: "filtering",
    input: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string", maxLength: 200 } },
    },
    effects: ["filters visible rows", "resets to page 0"],
    reversible: true,
  },

  filter: {
    name: "filter",
    summary: "Apply a typed filter to one column. Operators are constrained by the column's type.",
    apiMethod: "setFilter",
    requires: "filtering",
    input: {
      type: "object",
      required: ["column", "operator"],
      properties: {
        column: COLUMN,
        operator: {
          enum: [
            "contains", "notContains", "equals", "notEquals", "startsWith", "endsWith",
            "gt", "gte", "lt", "lte", "between", "before", "after", "in",
            "isEmpty", "isNotEmpty",
          ],
        },
        value: {},
        value2: { description: "Upper bound; only for the `between` operator." },
      },
    },
    effects: ["filters visible rows", "resets to page 0"],
    reversible: true,
  },

  clearFilters: {
    name: "clearFilters",
    summary: "Remove every column filter and the search text.",
    apiMethod: "clearFilters",
    requires: "filtering",
    effects: ["restores every row"],
    reversible: true,
  },

  sort: {
    name: "sort",
    summary: "Sort by one column, replacing the current sort unless `append` is set.",
    apiMethod: "setSorting",
    requires: "sorting",
    input: {
      type: "object",
      required: ["column", "direction"],
      properties: {
        column: COLUMN,
        direction: { enum: ["asc", "desc"] },
        append: { type: "boolean", default: false, description: "Add to the existing sort instead of replacing it." },
      },
    },
    effects: ["reorders visible rows"],
    reversible: true,
  },

  clearSort: {
    name: "clearSort",
    summary: "Return to the data's original order.",
    apiMethod: "setSorting",
    requires: "sorting",
    effects: ["reorders visible rows"],
    reversible: true,
  },

  selectRows: {
    name: "selectRows",
    summary: "Select or deselect rows by id.",
    apiMethod: "toggleRowSelected",
    requires: "selection",
    input: {
      type: "object",
      required: ["rowIds"],
      properties: {
        rowIds: { type: "array", items: { type: "string" }, minItems: 1 },
        value: { type: "boolean", default: true },
      },
    },
    effects: ["changes rowSelection"],
    reversible: true,
  },

  selectAll: {
    name: "selectAll",
    summary: "Select, or clear, every row matching the current filters.",
    apiMethod: "toggleAllRowsSelected",
    requires: "selection",
    input: { type: "object", properties: { value: { type: "boolean", default: true } } },
    effects: ["changes rowSelection"],
    reversible: true,
  },

  clearSelection: {
    name: "clearSelection",
    summary: "Deselect every row.",
    apiMethod: "clearSelection",
    requires: "selection",
    effects: ["changes rowSelection"],
    reversible: true,
  },

  setColumnVisibility: {
    name: "setColumnVisibility",
    summary: "Show or hide one column.",
    apiMethod: "setColumnVisibility",
    requires: "columnHiding",
    input: {
      type: "object",
      required: ["column", "visible"],
      properties: { column: COLUMN, visible: { type: "boolean" } },
    },
    effects: ["changes columnVisibility"],
    reversible: true,
  },

  pinColumn: {
    name: "pinColumn",
    summary: "Pin a column to an edge, or unpin it with a null side.",
    apiMethod: "pinColumn",
    requires: "columnPinning",
    input: {
      type: "object",
      required: ["column", "side"],
      properties: { column: COLUMN, side: { enum: ["left", "right", null] } },
    },
    effects: ["changes columnPinning"],
    reversible: true,
  },

  moveColumn: {
    name: "moveColumn",
    summary: "Move a column before or after another one.",
    apiMethod: "moveColumn",
    requires: "columnReordering",
    input: {
      type: "object",
      required: ["column", "target", "placement"],
      properties: { column: COLUMN, target: COLUMN, placement: { enum: ["before", "after"] } },
    },
    effects: ["changes columnOrder"],
    reversible: true,
  },

  setColumnWidth: {
    name: "setColumnWidth",
    summary: "Set a column's width in pixels, or null to restore its default.",
    apiMethod: "setColumnWidth",
    requires: "columnResizing",
    input: {
      type: "object",
      required: ["column", "width"],
      properties: { column: COLUMN, width: { type: ["integer", "null"], minimum: 1 } },
    },
    effects: ["changes columnSizing"],
    reversible: true,
  },

  resetColumns: {
    name: "resetColumns",
    summary: "Restore column order, width, visibility and pinning to their defaults.",
    apiMethod: "resetColumns",
    effects: ["changes columnOrder", "changes columnVisibility", "changes columnSizing", "changes columnPinning"],
    reversible: true,
  },

  setPage: {
    name: "setPage",
    summary: "Jump to a page, counting from zero.",
    apiMethod: "setPageIndex",
    requires: "pagination",
    input: { type: "object", required: ["index"], properties: { index: { type: "integer", minimum: 0 } } },
    effects: ["changes the visible page"],
    reversible: true,
  },

  setPageSize: {
    name: "setPageSize",
    summary: "Change how many rows a page holds.",
    apiMethod: "setPageSize",
    requires: "pagination",
    input: { type: "object", required: ["size"], properties: { size: { type: "integer", minimum: 1 } } },
    effects: ["changes the visible page"],
    reversible: true,
  },

  setDensity: {
    name: "setDensity",
    summary: "Change row height.",
    apiMethod: "setDensity",
    input: {
      type: "object",
      required: ["density"],
      properties: { density: { enum: ["compact", "standard", "comfortable"] } },
    },
    effects: ["changes row height"],
    reversible: true,
  },

  export: {
    name: "export",
    summary: "Download the chosen rows as a file.",
    // Three formats, three GridApi methods — so no single apiMethod applies.
    input: {
      type: "object",
      required: ["format"],
      properties: {
        format: { enum: ["csv", "excel", "pdf"] },
        scope: SCOPE,
        fileName: { type: "string", maxLength: 120 },
      },
    },
    effects: ["downloads a file"],
    reversible: false,
    requiresConfirmation: true,
  },

  print: {
    name: "print",
    summary: "Open the browser's print dialog with the table laid out for paper.",
    apiMethod: "print",
    input: { type: "object", properties: { scope: SCOPE, title: { type: "string", maxLength: 120 } } },
    effects: ["opens the print dialog"],
    reversible: false,
    requiresConfirmation: true,
  },

  copy: {
    name: "copy",
    summary: "Copy the selected rows to the clipboard as tab-separated text.",
    apiMethod: "copyToClipboard",
    effects: ["writes to the clipboard"],
    reversible: false,
    requiresConfirmation: true,
  },

  undo: {
    name: "undo",
    // Performed by the agent's snapshot history, not by the grid.
    summary: "Restore the state from before the last operation.",
    effects: ["restores a previous state"],
    reversible: false,
  },

  redo: {
    name: "redo",
    summary: "Re-apply the operation that was last undone.",
    effects: ["restores a later state"],
    reversible: false,
  },
};

export const GRID_OPERATION_NAMES = Object.keys(GRID_OPERATIONS) as GridOperationName[];

export const isGridOperation = (name: string): name is GridOperationName =>
  Object.prototype.hasOwnProperty.call(GRID_OPERATIONS, name);
