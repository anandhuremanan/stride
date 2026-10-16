import type {
  ColumnFilter,
  FilterOperator,
  FilterValue,
  GridRow,
  ResolvedColumn,
} from "./types";
import {
  formatCellValue,
  isEmptyValue,
  startOfDay,
  startOfNextDay,
  toTime,
  type Formatters,
} from "./values";

const STRING_OPERATORS: FilterOperator[] = [
  "contains",
  "notContains",
  "equals",
  "notEquals",
  "startsWith",
  "endsWith",
  "isEmpty",
  "isNotEmpty",
];
const NUMBER_OPERATORS: FilterOperator[] = [
  "equals",
  "notEquals",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "isEmpty",
  "isNotEmpty",
];
const DATE_OPERATORS: FilterOperator[] = [
  "equals",
  "before",
  "after",
  "between",
  "isEmpty",
  "isNotEmpty",
];

export function getFilterOperators<T>(column: ResolvedColumn<T>): FilterOperator[] {
  if (column.def.options) return ["in", "isEmpty", "isNotEmpty"];
  switch (column.type) {
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "boolean":
      return ["equals"];
    default:
      return STRING_OPERATORS;
  }
}

const hasValue = (value: FilterValue | undefined) =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

/** A filter with no usable value (e.g. an empty text box) matches everything. */
export function isFilterActive(filter: ColumnFilter): boolean {
  switch (filter.operator) {
    case "isEmpty":
    case "isNotEmpty":
      return true;
    case "between":
      return hasValue(filter.value) || hasValue(filter.value2);
    default:
      return hasValue(filter.value);
  }
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isNaN(n) ? null : n;
};

type Predicate<T> = (row: T) => boolean;

export function compileFilter<T>(
  column: ResolvedColumn<T>,
  filter: ColumnFilter,
  formatters: Formatters,
): Predicate<T> | null {
  if (!isFilterActive(filter)) return null;

  const { getValue } = column;
  const { filterFn } = column.def;
  if (filterFn) return (row) => filterFn(getValue(row), filter, row);

  const { operator } = filter;
  if (operator === "isEmpty") return (row) => isEmptyValue(getValue(row));
  if (operator === "isNotEmpty") return (row) => !isEmptyValue(getValue(row));

  if (operator === "in") {
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const allowed = new Set(values.map(String));
    return (row) => allowed.has(String(getValue(row)));
  }

  switch (column.type) {
    case "number": {
      const a = toNumber(filter.value);
      const b = toNumber(filter.value2);
      return (row) => {
        const v = toNumber(getValue(row));
        if (v === null) return operator === "notEquals";
        switch (operator) {
          case "equals": return a === null || v === a;
          case "notEquals": return a === null || v !== a;
          case "gt": return a === null || v > a;
          case "gte": return a === null || v >= a;
          case "lt": return a === null || v < a;
          case "lte": return a === null || v <= a;
          case "between": return (a === null || v >= a) && (b === null || v <= b);
          default: return true;
        }
      };
    }

    case "date": {
      const a = toTime(filter.value);
      const b = toTime(filter.value2);
      const aStart = a === null ? null : startOfDay(a);
      const aEnd = a === null ? null : startOfNextDay(a);
      const bEnd = b === null ? null : startOfNextDay(b);
      return (row) => {
        const t = toTime(getValue(row));
        if (t === null) return false;
        switch (operator) {
          case "equals": return aStart === null || (t >= aStart && t < aEnd!);
          case "before": return aStart === null || t < aStart;
          case "after": return aEnd === null || t >= aEnd;
          case "between":
            return (aStart === null || t >= aStart) && (bEnd === null || t < bEnd);
          default: return true;
        }
      };
    }

    case "boolean": {
      const wanted = filter.value === true || filter.value === "true";
      return (row) => Boolean(getValue(row)) === wanted;
    }

    default: {
      const needle = String(filter.value).toLocaleLowerCase();
      const text = (row: T) =>
        formatCellValue(column, getValue(row), row, formatters).toLocaleLowerCase();
      switch (operator) {
        case "contains": return (row) => text(row).includes(needle);
        case "notContains": return (row) => !text(row).includes(needle);
        case "equals": return (row) => text(row) === needle;
        case "notEquals": return (row) => text(row) !== needle;
        case "startsWith": return (row) => text(row).startsWith(needle);
        case "endsWith": return (row) => text(row).endsWith(needle);
        default: return null;
      }
    }
  }
}

/**
 * Search text per row, built once per (columns, formatters) and reused across
 * keystrokes. Rows are rebuilt when `data` changes, which invalidates the cache.
 */
const searchCache = new WeakMap<
  readonly ResolvedColumn<unknown>[],
  { formatters: Formatters; text: WeakMap<object, string> }
>();

function getSearchText<T>(
  row: GridRow<T>,
  columns: readonly ResolvedColumn<T>[],
  formatters: Formatters,
): string {
  const key = columns as readonly ResolvedColumn<unknown>[];
  let entry = searchCache.get(key);
  if (!entry || entry.formatters !== formatters) {
    entry = { formatters, text: new WeakMap() };
    searchCache.set(key, entry);
  }
  let text = entry.text.get(row);
  if (text === undefined) {
    const parts: string[] = [];
    for (const column of columns) {
      if (!column.searchable) continue;
      const value = column.getValue(row.original);
      parts.push(formatCellValue(column, value, row.original, formatters));
    }
    text = parts.join("").toLocaleLowerCase();
    entry.text.set(row, text);
  }
  return text;
}

/** Applies column filters (AND) and the global search (every term must match). */
export function filterRows<T>(
  rows: GridRow<T>[],
  columns: readonly ResolvedColumn<T>[],
  filters: readonly ColumnFilter[],
  globalFilter: string,
  formatters: Formatters,
): GridRow<T>[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const predicates: Predicate<T>[] = [];
  for (const filter of filters) {
    const column = byId.get(filter.columnId);
    const predicate = column && compileFilter(column, filter, formatters);
    if (predicate) predicates.push(predicate);
  }
  const terms = globalFilter.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

  // Returning the same array keeps downstream memoization intact.
  if (predicates.length === 0 && terms.length === 0) return rows;

  return rows.filter((row) => {
    for (const predicate of predicates) {
      if (!predicate(row.original)) return false;
    }
    if (terms.length > 0) {
      const text = getSearchText(row, columns, formatters);
      for (const term of terms) {
        if (!text.includes(term)) return false;
      }
    }
    return true;
  });
}
