import type { GridOptions, GridRow, PaginationState, RowId } from "./types";

export type RowIdGetter<T> = (row: T, index: number) => RowId;

export function createRowIdGetter<T>(
  getRowId: GridOptions<T>["getRowId"],
): RowIdGetter<T> {
  if (typeof getRowId === "function") {
    return (row, index) => String(getRowId(row, index));
  }
  if (typeof getRowId === "string") {
    return (row) => String(row[getRowId]);
  }
  return (row, index) => {
    const id = (row as { id?: unknown } | null)?.id;
    return id === null || id === undefined ? String(index) : String(id);
  };
}

export function buildRows<T>(
  data: readonly T[],
  getRowId: RowIdGetter<T>,
): GridRow<T>[] {
  return data.map((original, index) => ({
    id: getRowId(original, index),
    index,
    original,
  }));
}

export interface PageResult<T> {
  rows: GridRow<T>[];
  pageIndex: number;
  pageCount: number;
  /** Total rows across all pages. */
  rowCount: number;
  /** Absolute index of the first row on the page. */
  pageOffset: number;
}

export function paginate<T>(
  rows: GridRow<T>[],
  pagination: PaginationState,
  options: { enabled: boolean; server: boolean; rowCount?: number },
): PageResult<T> {
  const total = options.server ? (options.rowCount ?? rows.length) : rows.length;

  if (!options.enabled) {
    return { rows, pageIndex: 0, pageCount: 1, rowCount: total, pageOffset: 0 };
  }

  const pageSize = Math.max(1, pagination.pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageIndex = Math.min(Math.max(0, pagination.pageIndex), pageCount - 1);
  const pageOffset = pageIndex * pageSize;

  return {
    rows: options.server ? rows : rows.slice(pageOffset, pageOffset + pageSize),
    pageIndex,
    pageCount,
    rowCount: total,
    pageOffset,
  };
}
