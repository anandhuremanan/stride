import type { ExportTable } from "./table";

/** Spreadsheet apps execute cells starting with these characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function escapeField(text: string, isText: boolean, delimiter: string): string {
  const safe = isText && FORMULA_PREFIX.test(text) ? `'${text}` : text;
  const needsQuotes =
    safe.includes(delimiter) || safe.includes('"') || safe.includes("\n") || safe.includes("\r");
  return needsQuotes ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function serialize(table: ExportTable, delimiter: string): string {
  const lines = [table.columns.map((c) => escapeField(c.header, true, delimiter)).join(delimiter)];
  table.text.forEach((row, r) => {
    lines.push(
      row
        .map((text, c) => escapeField(text, typeof table.values[r][c] === "string", delimiter))
        .join(delimiter),
    );
  });
  return lines.join("\r\n");
}

export const toCsv = (table: ExportTable) => serialize(table, ",");

export const toTsv = (table: ExportTable) => serialize(table, "\t");

export function createCsvBlob(table: ExportTable): Blob {
  // The BOM makes Excel read the file as UTF-8.
  return new Blob(["﻿", toCsv(table)], { type: "text/csv;charset=utf-8" });
}
