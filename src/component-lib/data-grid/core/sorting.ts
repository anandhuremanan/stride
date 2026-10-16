import type { GridRow, ResolvedColumn, SortItem } from "./types";
import { toTime } from "./values";

/**
 * One collator per locale. `undefined` means the runtime's own locale, which is
 * what the grid used everywhere before it took a `locale` prop; passing the
 * prop through keeps the order of the rows and the formatting of their values
 * speaking the same language.
 */
const collators = new Map<string, Intl.Collator>();

function collatorFor(locale?: string): Intl.Collator {
  const key = locale ?? "";
  let found = collators.get(key);
  if (!found) {
    found = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    collators.set(key, found);
  }
  return found;
}

type SortKey = number | null;

/**
 * Converts a column's values into numbers once, so the sort itself only does
 * numeric comparisons. Strings become their collation rank.
 */
function buildKeys<T>(
  rows: GridRow<T>[],
  column: ResolvedColumn<T>,
  locale?: string,
): SortKey[] {
  const values = rows.map((row) => column.getValue(row.original));

  switch (column.type) {
    case "number":
      return values.map((v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      });
    case "date":
      return values.map(toTime);
    case "boolean":
      return values.map((v) => (v === null || v === undefined ? null : v ? 1 : 0));
    default: {
      const { options } = column.def;
      const labels = options && new Map(options.map((o) => [o.value, o.label]));
      const strings = values.map((v) =>
        v === null || v === undefined || v === ""
          ? null
          : String(labels?.get(v as string | number) ?? v),
      );
      const collator = collatorFor(locale);
      const unique = Array.from(new Set(strings.filter((s) => s !== null)));
      unique.sort(collator.compare);
      const rank = new Map<string, number>();
      let current = 0;
      unique.forEach((s, i) => {
        if (i > 0 && collator.compare(unique[i - 1], s) !== 0) current = i;
        rank.set(s, current);
      });
      return strings.map((s) => (s === null ? null : rank.get(s)!));
    }
  }
}

/** Stable multi-column sort. Empty values always sort last. */
export function sortRows<T>(
  rows: GridRow<T>[],
  columns: readonly ResolvedColumn<T>[],
  sorting: readonly SortItem[],
  locale?: string,
): GridRow<T>[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const active = sorting
    .map((item) => ({ column: byId.get(item.columnId), desc: item.desc }))
    .filter(
      (item): item is { column: ResolvedColumn<T>; desc: boolean } =>
        item.column !== undefined && item.column.hasValue,
    );

  if (active.length === 0 || rows.length < 2) return rows;

  const comparators = active.map(({ column, desc }) => {
    const direction = desc ? -1 : 1;
    const { sortFn } = column.def;
    if (sortFn) {
      const values = rows.map((row) => column.getValue(row.original));
      return (i: number, j: number) =>
        direction * sortFn(values[i], values[j], rows[i].original, rows[j].original);
    }
    const keys = buildKeys(rows, column, locale);
    return (i: number, j: number) => {
      const a = keys[i];
      const b = keys[j];
      if (a === b) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a < b ? -direction : direction;
    };
  });

  const indices = rows.map((_, i) => i);
  indices.sort((i, j) => {
    for (const compare of comparators) {
      const result = compare(i, j);
      if (result !== 0) return result;
    }
    return i - j;
  });
  return indices.map((i) => rows[i]);
}

/** Click cycles asc → desc → off. With `multi`, other sorts are kept. */
export function toggleSorting(
  sorting: readonly SortItem[],
  columnId: string,
  multi: boolean,
): SortItem[] {
  const existing = sorting.find((s) => s.columnId === columnId);
  const next: SortItem | null = !existing
    ? { columnId, desc: false }
    : !existing.desc
      ? { columnId, desc: true }
      : null;

  if (!multi) return next ? [next] : [];
  if (!existing) return [...sorting, next!];
  return next
    ? sorting.map((s) => (s.columnId === columnId ? next : s))
    : sorting.filter((s) => s.columnId !== columnId);
}
