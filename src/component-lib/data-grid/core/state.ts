import { getColumnId } from "./columns";
import type { GridOptions, GridQuery, GridState } from "./types";

export const DEFAULT_PAGE_SIZE = 50;

export const STATE_KEYS = [
  "sorting",
  "filters",
  "globalFilter",
  "pagination",
  "rowSelection",
  "columnOrder",
  "columnVisibility",
  "columnSizing",
  "columnPinning",
  "density",
] as const satisfies readonly (keyof GridState)[];

const QUERY_KEYS = ["sorting", "filters", "globalFilter", "pagination"] as const;

/** Initial state, seeded from `initialState` and column-level `pin` / `hidden`. */
export function createInitialState<T>(options: GridOptions<T>): GridState {
  const init = options.initialState ?? {};
  const left: string[] = [];
  const right: string[] = [];
  const visibility: Record<string, boolean> = {};

  for (const def of options.columns) {
    const id = getColumnId(def);
    if (def.pin === "left") left.push(id);
    if (def.pin === "right") right.push(id);
    if (def.hidden) visibility[id] = false;
  }

  return {
    sorting: init.sorting ?? [],
    filters: init.filters ?? [],
    globalFilter: init.globalFilter ?? "",
    pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE, ...init.pagination },
    rowSelection: init.rowSelection ?? {},
    columnOrder: init.columnOrder ?? [],
    columnVisibility: init.columnVisibility ?? visibility,
    columnSizing: init.columnSizing ?? {},
    columnPinning: init.columnPinning ?? { left, right },
    density: init.density ?? "standard",
  };
}

/** Controlled keys (not undefined) win over internal state. */
export function mergeState(
  internal: GridState,
  controlled: Partial<GridState> | undefined,
): GridState {
  if (!controlled) return internal;
  let merged: GridState | null = null;
  for (const key of STATE_KEYS) {
    const value = controlled[key];
    if (value !== undefined && value !== internal[key]) {
      merged ??= { ...internal };
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged ?? internal;
}

export function pickQuery(state: GridState): GridQuery {
  return {
    sorting: state.sorting,
    filters: state.filters,
    globalFilter: state.globalFilter,
    pagination: state.pagination,
  };
}

export function queryChanged(a: GridState, b: GridState): boolean {
  return QUERY_KEYS.some((key) => a[key] !== b[key]);
}

/** Filters, search and sort changes move the grid back to the first page. */
export function resetsPage(a: GridState, b: GridState): boolean {
  return a.filters !== b.filters || a.globalFilter !== b.globalFilter || a.sorting !== b.sorting;
}
