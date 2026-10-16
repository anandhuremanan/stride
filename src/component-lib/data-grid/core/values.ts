import type { ResolvedColumn } from "./types";

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface Formatters {
  date: Intl.DateTimeFormat;
  yes: string;
  no: string;
}

export function createFormatters(
  locale?: string,
  labels: { yes: string; no: string } = { yes: "Yes", no: "No" },
): Formatters {
  return {
    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    ...labels,
  };
}

/** Milliseconds since epoch, or null. Date-only strings are read as local dates. */
export function toTime(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value !== "") {
    const match = DATE_ONLY.exec(value);
    const time = match
      ? new Date(+match[1], +match[2] - 1, +match[3]).getTime()
      : Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

export function startOfNextDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

export function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "") ||
    (typeof value === "number" && Number.isNaN(value)) ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** `YYYY-MM-DD` in local time, for `<input type="date">`. */
export function toDateInputValue(value: unknown): string {
  const time = toTime(value);
  if (time === null) return "";
  const date = new Date(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Display text for a cell; also used by search, CSV, PDF and clipboard copy. */
export function formatCellValue<T>(
  column: ResolvedColumn<T>,
  value: unknown,
  row: T,
  formatters: Formatters,
): string {
  if (column.def.format) return column.def.format(value, row);
  if (value === null || value === undefined) return "";

  const { options } = column.def;
  if (options) {
    const option = options.find((o) => o.value === value);
    if (option) return option.label;
  }

  switch (column.type) {
    case "date": {
      const time = toTime(value);
      return time === null ? String(value) : formatters.date.format(time);
    }
    case "boolean":
      return value ? formatters.yes : formatters.no;
    default:
      if (Array.isArray(value)) return value.join(", ");
      if (value instanceof Date) return formatters.date.format(value);
      return String(value);
  }
}
