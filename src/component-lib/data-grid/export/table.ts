import type { ColumnType, ExportCellValue, ResolvedColumn } from "../core/types";
import { formatCellValue, toTime, type Formatters } from "../core/values";

export interface ExportColumn {
  header: string;
  width: number;
  type: ColumnType;
}

export interface ExportTable {
  columns: ExportColumn[];
  /** Typed values, for formats that keep types (XLSX). */
  values: ExportCellValue[][];
  /** Display text, for text formats (CSV, PDF, clipboard). */
  text: string[][];
}

function typedValue<T>(column: ResolvedColumn<T>, raw: unknown, text: string): ExportCellValue {
  if (raw === null || raw === undefined) return null;
  if (column.def.options) return text;
  if (typeof raw === "number" || typeof raw === "boolean") return raw;
  if (raw instanceof Date) return raw;
  if (column.type === "date") {
    const time = toTime(raw);
    return time === null ? text : new Date(time);
  }
  return text;
}

export function buildExportTable<T>(
  rows: readonly T[],
  items: readonly { column: ResolvedColumn<T>; width: number }[],
  formatters: Formatters,
): ExportTable {
  const values: ExportCellValue[][] = [];
  const text: string[][] = [];

  for (const row of rows) {
    const rowValues: ExportCellValue[] = [];
    const rowText: string[] = [];
    for (const { column } of items) {
      const { exportValue } = column.def;
      if (exportValue) {
        const value = exportValue(row);
        rowValues.push(value);
        rowText.push(
          value === null || value === undefined
            ? ""
            : value instanceof Date
              ? formatters.date.format(value)
              : String(value),
        );
      } else {
        const raw = column.getValue(row);
        const display = formatCellValue(column, raw, row, formatters);
        rowValues.push(typedValue(column, raw, display));
        rowText.push(display);
      }
    }
    values.push(rowValues);
    text.push(rowText);
  }

  return {
    columns: items.map(({ column, width }) => ({
      header: column.header,
      width,
      type: column.type,
    })),
    values,
    text,
  };
}
