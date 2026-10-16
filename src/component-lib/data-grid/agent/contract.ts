/*
 * The runtime contract: what *this* grid can do, right now.
 *
 * The passport says "DataGrid can filter, sort, search, select and export".
 * That is true of every DataGrid ever rendered and so tells a caller nothing
 * about the one in front of it. The runtime contract is the other half:
 *
 *   columns      revenue is a number, filterable, measured in INR
 *   capabilities this instance has selection off and pinning on
 *   state        two filters and a descending sort are active
 *   stats        1,842 of 9,310 rows match
 *
 * Three rules hold throughout:
 *
 *   - No rows. Counts and bounded summaries only. A contract is the thing
 *     most likely to be handed to a model, and rows are the thing most likely
 *     to be regretted.
 *   - Nothing invented. Every capability traces to a grid option or a
 *     resolved column flag. There is no `grouping`, because there is no
 *     grouping.
 *   - Effective, not nominal. Policy is applied here, so a column the host
 *     forbade reports `filterable: false` and carries no summary.
 */

import { getFilterOperators } from "../core/filtering";
import type {
  ColumnOption,
  ColumnType,
  Density,
  FilterOperator,
  FilterValue,
  GridOptions,
  ResolvedColumn,
} from "../core/types";
import { toDateInputValue, toTime } from "../core/values";
import type { GridDataset } from "./dataset";
import { GRID_OPERATIONS, type GridOperationName } from "./operations";

export const GRID_CONTRACT_VERSION = "1.0.0";

// ------------------------------------------------------------------ authored

/**
 * What a machine cannot read off the column definition. Supplied by the host;
 * nothing here is guessed, and an absent entry simply means less context.
 */
export interface GridColumnSemantics {
  /** What the column means, in words, for a model's prompt. */
  description?: string;
  /** Display unit. An ISO 4217 code such as `INR` also drives money formatting. */
  unit?: string;
  /** How a percent column stores its numbers: 20 (`whole`) or 0.2 (`fraction`). */
  percentBasis?: "whole" | "fraction";
  /** Which end is the good end. Lets "worst performing" resolve to a direction. */
  higherIsBetter?: boolean;
  /** Other words a person might use for this column. */
  synonyms?: readonly string[];
  /** Personal data. Denied by default — see `GridAgentPolicy.denyPii`. */
  pii?: boolean;
}

export interface GridAgentPolicy {
  /** Columns no operation may touch. */
  deny?: readonly string[];
  /** Columns that may not be filtered or searched on. */
  denyFilter?: readonly string[];
  /** Treat columns marked `pii` as denied. Default true. */
  denyPii?: boolean;
  /** Operations withheld from this instance. */
  denyOperations?: readonly GridOperationName[];
  /** Refuse an export of more rows than this. */
  maxExportRows?: number;
  /** Ask before exporting more rows than this. Default 5000. */
  confirmExportRows?: number;
  allowExportFormats?: readonly ("csv" | "excel" | "pdf")[];
  /** Rows one `selectRows` may name. Default 1000. */
  maxSelectRows?: number;
  /** Warn when a filter would leave nothing. Default true. */
  warnOnEmptyResult?: boolean;
}

// ------------------------------------------------------------------ contract

export type GridColumnStats =
  | { kind: "number"; min: number; max: number; nulls: number }
  | { kind: "date"; min: string; max: string; nulls: number }
  | { kind: "boolean"; true: number; false: number; nulls: number }
  | { kind: "string"; distinct: number; nulls: number; values?: string[] };

export interface GridContractColumn {
  id: string;
  label: string;
  type: ColumnType;
  visible: boolean;
  pinned: "left" | "right" | null;
  sortable: boolean;
  filterable: boolean;
  searchable: boolean;
  hideable: boolean;
  pinnable: boolean;
  reorderable: boolean;
  resizable: boolean;
  exportable: boolean;
  editable: boolean;
  /** Operators legal for this column's type. Empty when it cannot be filtered. */
  operators: FilterOperator[];
  /** Fixed choices from the column definition. */
  options?: ColumnOption[];
  unit?: string;
  percentBasis?: "whole" | "fraction";
  higherIsBetter?: boolean;
  synonyms?: string[];
  description?: string;
  /** Present when policy, not the grid, is what closed this column down. */
  restricted?: "policy";
  stats?: GridColumnStats;
}

export interface GridCapabilities {
  mode: "client" | "server";
  sorting: boolean;
  multiSort: boolean;
  filtering: boolean;
  globalSearch: boolean;
  pagination: boolean;
  selection: boolean;
  selectionMode: "single" | "multiple";
  columnResizing: boolean;
  columnReordering: boolean;
  columnPinning: boolean;
  columnHiding: boolean;
  /** Cells can be edited in place. No operation exposes this; it is context. */
  editing: boolean;
  exportFormats: ("csv" | "excel" | "pdf")[];
  print: boolean;
  clipboard: boolean;
  undo: boolean;
}

export interface GridContractState {
  sorting: { column: string; direction: "asc" | "desc" }[];
  filters: { column: string; operator: FilterOperator; value?: FilterValue; value2?: FilterValue }[];
  search: string;
  page: { index: number; size: number; count: number };
  selection: { count: number; all: boolean };
  density: Density;
  hiddenColumns: string[];
  pinnedColumns: { left: string[]; right: string[] };
  canUndo: boolean;
  canRedo: boolean;
}

export interface GridContractStats {
  /** Rows behind the grid. Null in server mode unless `rowCount` was given. */
  totalRows: number | null;
  /** Rows matching the current query. Null in server mode. */
  filteredRows: number | null;
  pageRows: number;
  selectedRows: number;
}

export interface GridRuntimeContract {
  contract: "gbs.datagrid";
  contractVersion: string;
  component: "DataGrid";
  /** Stable for a given set of columns; pass your own to make it meaningful. */
  instanceId: string;
  capabilities: GridCapabilities;
  columns: GridContractColumn[];
  /** Operation names this instance offers, after capabilities and policy. */
  operations: GridOperationName[];
  state: GridContractState;
  stats: GridContractStats;
}

// --------------------------------------------------------------------- build

/** FNV-1a. Short, stable, and not a security boundary. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

function summarise<T>(
  column: ResolvedColumn<T>,
  values: unknown[],
  maxEnumValues: number,
): GridColumnStats | undefined {
  const present = values.filter((v) => v !== null && v !== undefined && v !== "");
  const nulls = values.length - present.length;
  if (present.length === 0) return undefined;

  switch (column.type) {
    case "number": {
      const numbers = present.map(Number).filter((n) => !Number.isNaN(n));
      if (numbers.length === 0) return undefined;
      return { kind: "number", min: Math.min(...numbers), max: Math.max(...numbers), nulls };
    }
    case "date": {
      const times = present.map(toTime).filter((t): t is number => t !== null);
      if (times.length === 0) return undefined;
      // Local, not UTC: a date-only value is read as a local date, so
      // formatting it back through UTC would shift it east of Greenwich.
      return {
        kind: "date",
        min: toDateInputValue(Math.min(...times)),
        max: toDateInputValue(Math.max(...times)),
        nulls,
      };
    }
    case "boolean": {
      let yes = 0;
      for (const value of present) if (value) yes += 1;
      return { kind: "boolean", true: yes, false: present.length - yes, nulls };
    }
    default: {
      const distinct = new Set(present.map(String));
      const stats: GridColumnStats = { kind: "string", distinct: distinct.size, nulls };
      /*
       * Category columns get their values listed, which is what stops a model
       * inventing a region that does not exist. Identifier columns must not:
       * a name or an invoice number is the data itself, and in a small table
       * every column looks low-cardinality. The test is whether any value
       * repeats — a category has fewer distinct values than it has rows, an
       * identifier has exactly as many.
       */
      if (distinct.size <= maxEnumValues && distinct.size < present.length) {
        stats.values = [...distinct].sort();
      }
      return stats;
    }
  }
}

export interface BuildContractOptions<T> {
  options: GridOptions<T>;
  dataset: GridDataset<T>;
  state: import("../core/types").GridState;
  instanceId?: string;
  semantics?: Readonly<Record<string, GridColumnSemantics>>;
  policy?: GridAgentPolicy;
  /** Column summaries and derived enum values. Default true. */
  stats?: boolean;
  /** Above this many distinct values a string column stops listing them. Default 20. */
  maxEnumValues?: number;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function buildGridContract<T>(input: BuildContractOptions<T>): GridRuntimeContract {
  const {
    options,
    dataset,
    state,
    semantics = {},
    policy = {},
    stats: wantStats = true,
    maxEnumValues = 20,
    canUndo = false,
    canRedo = false,
  } = input;

  const denyPii = policy.denyPii !== false;
  const denied = new Set(policy.deny ?? []);
  const deniedFilter = new Set(policy.denyFilter ?? []);

  const pagination = options.enablePagination !== false;
  const selection = options.enableRowSelection !== undefined && options.enableRowSelection !== false;
  const filtering = options.enableFiltering !== false;

  const columns: GridContractColumn[] = dataset.columns.map((column) => {
    const meta = semantics[column.id] ?? {};
    const off = denied.has(column.id) || (denyPii && meta.pii === true);
    const noFilter = off || deniedFilter.has(column.id);
    const visible = state.columnVisibility[column.id] !== false;
    const pinned = state.columnPinning.left.includes(column.id)
      ? "left"
      : state.columnPinning.right.includes(column.id)
        ? "right"
        : null;

    const filterable = column.filterable && filtering && !noFilter;
    const entry: GridContractColumn = {
      id: column.id,
      label: column.header,
      type: column.type,
      visible,
      pinned,
      sortable: column.sortable && options.enableSorting !== false && !off,
      filterable,
      searchable: column.searchable && filtering && !noFilter,
      hideable: column.hideable && options.enableColumnHiding !== false,
      pinnable: column.pinnable && options.enableColumnPinning !== false,
      reorderable: column.reorderable && options.enableColumnReordering !== false,
      resizable: column.resizable && options.enableColumnResizing !== false,
      exportable: column.exportable && !off,
      editable: column.def.editable !== undefined && column.def.editable !== false,
      operators: filterable ? getFilterOperators(column) : [],
    };

    if (column.def.options) entry.options = [...column.def.options];
    if (meta.unit) entry.unit = meta.unit;
    if (meta.percentBasis) entry.percentBasis = meta.percentBasis;
    if (meta.higherIsBetter !== undefined) entry.higherIsBetter = meta.higherIsBetter;
    if (meta.synonyms?.length) entry.synonyms = [...meta.synonyms];
    if (meta.description) entry.description = meta.description;
    if (off) entry.restricted = "policy";

    // A restricted column is named so a caller knows why it cannot be used,
    // and summarised never, because a summary is the data in miniature.
    if (wantStats && !off && !entry.options) {
      const summary = summarise(column, dataset.values(column.id), maxEnumValues);
      if (summary) entry.stats = summary;
    }

    return entry;
  });

  const capabilities: GridCapabilities = {
    mode: options.mode ?? "client",
    sorting: options.enableSorting !== false,
    multiSort: options.enableSorting !== false && options.enableMultiSort !== false,
    filtering,
    globalSearch: filtering,
    pagination,
    selection,
    selectionMode: options.selectionMode ?? "multiple",
    columnResizing: options.enableColumnResizing !== false,
    columnReordering: options.enableColumnReordering !== false,
    columnPinning: options.enableColumnPinning !== false,
    columnHiding: options.enableColumnHiding !== false,
    editing: columns.some((column) => column.editable) && options.onCellEdit !== undefined,
    exportFormats: [...(policy.allowExportFormats ?? ["csv", "excel", "pdf"])],
    print: true,
    clipboard: true,
    undo: true,
  };

  const available: Record<NonNullable<import("./operations").GridOperationDefinition["requires"]>, boolean> = {
    sorting: capabilities.sorting,
    filtering: capabilities.filtering,
    selection: capabilities.selection,
    pagination: capabilities.pagination,
    columnHiding: capabilities.columnHiding,
    columnPinning: capabilities.columnPinning,
    columnReordering: capabilities.columnReordering,
    columnResizing: capabilities.columnResizing,
  };
  const withheld = new Set(policy.denyOperations ?? []);
  if (capabilities.exportFormats.length === 0) withheld.add("export");

  const operations = (Object.values(GRID_OPERATIONS) as (typeof GRID_OPERATIONS)[GridOperationName][])
    .filter((op) => !withheld.has(op.name) && (op.requires === undefined || available[op.requires]))
    .map((op) => op.name);

  const filteredRows = dataset.count(state.filters, state.globalFilter);
  const totalRows = dataset.total;
  const pageSize = Math.max(1, state.pagination.pageSize);
  const effectiveTotal = filteredRows ?? totalRows ?? dataset.rows.length;
  const pageCount = pagination ? Math.max(1, Math.ceil(effectiveTotal / pageSize)) : 1;
  const pageIndex = Math.min(Math.max(0, state.pagination.pageIndex), pageCount - 1);
  const selectedRows = Object.values(state.rowSelection).filter(Boolean).length;

  const contractState: GridContractState = {
    sorting: state.sorting.map((item) => ({
      column: item.columnId,
      direction: item.desc ? "desc" : "asc",
    })),
    filters: state.filters.map((filter) => ({
      column: filter.columnId,
      operator: filter.operator,
      ...(filter.value !== undefined ? { value: filter.value } : {}),
      ...(filter.value2 !== undefined ? { value2: filter.value2 } : {}),
    })),
    search: state.globalFilter,
    page: { index: pageIndex, size: pageSize, count: pageCount },
    selection: {
      count: selectedRows,
      all: filteredRows !== null && filteredRows > 0 && selectedRows >= filteredRows,
    },
    density: state.density,
    hiddenColumns: columns.filter((column) => !column.visible).map((column) => column.id),
    pinnedColumns: { left: [...state.columnPinning.left], right: [...state.columnPinning.right] },
    canUndo,
    canRedo,
  };

  return {
    contract: "gbs.datagrid",
    contractVersion: GRID_CONTRACT_VERSION,
    component: "DataGrid",
    instanceId: input.instanceId ?? `dg-${hash(dataset.columns.map((c) => c.id).join("|"))}`,
    capabilities,
    columns,
    operations,
    state: contractState,
    stats: {
      totalRows,
      filteredRows,
      pageRows: pagination
        ? Math.min(pageSize, Math.max(0, effectiveTotal - pageIndex * pageSize))
        : effectiveTotal,
      selectedRows,
    },
  };
}
