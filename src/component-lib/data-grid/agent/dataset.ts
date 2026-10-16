/*
 * The rows and columns the agent layer is allowed to look at.
 *
 * Everything else in `agent/` goes through this: it is the one place that
 * touches the data, which makes the privacy rule easy to hold — the runtime
 * contract reports counts and bounded summaries from here, never rows.
 *
 * The grid's own `resolveColumns`, `filterRows` and `paginate` are reused
 * rather than reimplemented, so a dry run counts exactly the rows the grid
 * would show.
 */

import { resolveColumns } from "../core/columns";
import { filterRows } from "../core/filtering";
import { buildRows, createRowIdGetter } from "../core/rows";
import type {
  ColumnFilter,
  GridOptions,
  GridRow,
  ResolvedColumn,
  RowId,
} from "../core/types";
import { createFormatters, type Formatters } from "../core/values";

export interface GridDataset<T> {
  columns: ResolvedColumn<T>[];
  columnById: Map<string, ResolvedColumn<T>>;
  rows: GridRow<T>[];
  formatters: Formatters;
  /** True in server mode, where `rows` is only the page the server sent. */
  partial: boolean;
  /** Total rows behind the grid, or null when only the server knows. */
  total: number | null;
  hasRowId(id: RowId): boolean;
  /** How many rows a query would show. Null when the data is only a page. */
  count(filters: readonly ColumnFilter[], globalFilter: string): number | null;
  /** Raw values of one column, for summary statistics. */
  values(columnId: string): unknown[];
}

const keyOf = (filters: readonly ColumnFilter[], globalFilter: string) =>
  `${globalFilter}\u0000${JSON.stringify(filters)}`;

export function createDataset<T>(options: GridOptions<T>, locale?: string): GridDataset<T> {
  const columns = resolveColumns(options.columns);
  const columnById = new Map(columns.map((column) => [column.id, column]));
  const rows = buildRows(options.data, createRowIdGetter(options.getRowId));
  const formatters = createFormatters(locale);
  const partial = options.mode === "server";

  let ids: Set<RowId> | null = null;
  const counts = new Map<string, number>();
  const valueCache = new Map<string, unknown[]>();

  return {
    columns,
    columnById,
    rows,
    formatters,
    partial,
    total: partial ? (options.rowCount ?? null) : rows.length,

    hasRowId(id) {
      ids ??= new Set(rows.map((row) => row.id));
      return ids.has(id);
    },

    count(filters, globalFilter) {
      // In server mode the client holds one page, so any count would be a lie.
      if (partial) return null;
      const key = keyOf(filters, globalFilter);
      let hit = counts.get(key);
      if (hit === undefined) {
        hit = filterRows(rows, columns, filters, globalFilter, formatters).length;
        // A handful of distinct queries per interaction; this is a guard, not a cache policy.
        if (counts.size > 64) counts.clear();
        counts.set(key, hit);
      }
      return hit;
    },

    values(columnId) {
      let hit = valueCache.get(columnId);
      if (!hit) {
        const column = columnById.get(columnId);
        hit = column ? rows.map((row) => column.getValue(row.original)) : [];
        valueCache.set(columnId, hit);
      }
      return hit;
    },
  };
}
