import type { KeyboardEvent } from "react";
import type { GridEngine } from "../core/grid";

const INTERACTIVE = "input, select, textarea, button, a[href], [contenteditable]";

/**
 * WAI-ARIA grid keyboard model: arrows, Home/End, Ctrl+Home/End, PageUp/Down,
 * Enter/F2 to edit (or sort on a header), Space to select, Ctrl+A, Ctrl+C.
 */
export function handleGridKeyDown<T>(event: KeyboardEvent<HTMLElement>, engine: GridEngine<T>): void {
  const model = engine.getModel();
  const target = event.target as HTMLElement;
  const cell = target.closest<HTMLElement>("[data-col-index]");
  if (!model || !cell) return;

  // Focus is inside the cell: an editor or a custom widget handles its own keys.
  if (cell !== target) {
    if (event.key === "Escape" && !target.closest(".dg-editor")) {
      event.preventDefault();
      cell.focus();
    }
    return;
  }

  const rowIndex = Number(cell.closest<HTMLElement>("[data-row-index]")?.dataset.rowIndex ?? -1);
  const colIndex = Number(cell.dataset.colIndex);
  const lastRow = model.page.rows.length - 1;
  const lastCol = model.layout.columns.length - 1;
  const rtl = getComputedStyle(cell).direction === "rtl";
  const mod = event.ctrlKey || event.metaKey;
  const options = engine.getOptions();
  const visibleRows = Math.max(
    1,
    Math.floor((engine.viewport.getSnapshot().height - model.headerHeight) / model.rowHeight) - 1,
  );
  const item = model.layout.columns[colIndex];
  const row = rowIndex >= 0 ? model.page.rows[rowIndex] : undefined;
  const { api } = engine;
  const go = (r: number, c: number) => engine.setActiveCell(r, c);

  switch (event.key) {
    case "ArrowUp":
      go(rowIndex - 1, colIndex);
      break;
    case "ArrowDown":
      go(rowIndex + 1, colIndex);
      break;
    case "ArrowLeft":
      go(rowIndex, colIndex + (rtl ? 1 : -1));
      break;
    case "ArrowRight":
      go(rowIndex, colIndex + (rtl ? -1 : 1));
      break;
    case "Home":
      go(mod ? -1 : rowIndex, 0);
      break;
    case "End":
      go(mod ? lastRow : rowIndex, lastCol);
      break;
    case "PageUp":
      go(rowIndex === -1 ? -1 : Math.max(0, rowIndex - visibleRows), colIndex);
      break;
    case "PageDown":
      go(Math.min(lastRow, Math.max(0, rowIndex + visibleRows)), colIndex);
      break;
    case "Enter":
    case "F2": {
      if (!item) return;
      if (rowIndex === -1) {
        if (event.key !== "Enter" || !item.column.sortable || options.enableSorting === false) return;
        api.toggleSort(item.column.id, event.shiftKey);
      } else if (row && !item.column.internal && engine.isCellEditable(row.original, item.column)) {
        api.startEditing(row.id, item.column.id);
      } else {
        const inner = cell.querySelector<HTMLElement>(INTERACTIVE);
        if (!inner) return;
        inner.focus();
      }
      break;
    }
    case " ": {
      if (rowIndex === -1 && item?.column.internal) {
        const selection = api.getState().rowSelection;
        const allSelected = model.sortedRows.every(
          (r) => !engine.isRowSelectable(r.original) || selection[r.id],
        );
        api.toggleAllRowsSelected(!allSelected);
      } else if (row && engine.isRowSelectable(row.original)) {
        api.toggleRowSelected(row.id, { range: event.shiftKey });
      } else {
        return;
      }
      break;
    }
    case "a":
    case "A":
      if (!mod || !options.enableRowSelection || options.selectionMode === "single") return;
      api.toggleAllRowsSelected(true);
      break;
    case "c":
    case "C":
      if (!mod || window.getSelection()?.toString()) return;
      void api.copyToClipboard();
      break;
    default:
      return;
  }

  event.preventDefault();
}
