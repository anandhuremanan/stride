"use client";

import { memo, type MouseEvent, type ReactNode } from "react";
import type { ColumnLayout, ColumnLayoutItem, GridRow } from "../core/types";
import type { Range } from "../core/virtual";
import { Cell } from "./Cell";
import { cx, NO_PENDING, useGridContext } from "./context";
import { useSelectionState, useStoreSelector } from "./hooks";

interface RowProps<T> {
  row: GridRow<T>;
  /** Index within the displayed rows. */
  rowIndex: number;
  ariaRowIndex: number;
  top: number;
  layout: ColumnLayout<T>;
  colRange: Range;
  className: string | undefined;
}

const INTERACTIVE = "button, a, input, select, textarea, label, [contenteditable], [data-dg-interactive], .dg-editor";

function RowView<T>({ row, rowIndex, ariaRowIndex, top, layout, colRange, className }: RowProps<T>) {
  const { engine, classNames, features, isRowSelectable } = useGridContext<T>();

  // Each subscription returns a primitive or a stable reference, so moving the
  // active cell or selecting a row only re-renders the rows involved.
  const activeCol = useStoreSelector(engine.store, (s) =>
    s.ui.activeCell?.rowIndex === rowIndex ? s.ui.activeCell.colIndex : -1,
  );
  const editingColumn = useStoreSelector(engine.store, (s) =>
    s.ui.editing?.rowId === row.id ? s.ui.editing.columnId : null,
  );
  const pending = useStoreSelector(engine.store, (s) => s.ui.pending[row.id]);
  const errors = useStoreSelector(engine.store, (s) => s.ui.errors[row.id]);
  const selected = useSelectionState<T, boolean>((selection) => selection[row.id] === true);
  const selectable = features.selection && isRowSelectable(row.original);

  const handleClick = (event: MouseEvent<HTMLDivElement>, kind: "click" | "double") => {
    const options = engine.getOptions();
    const handler = kind === "click" ? options.onRowClick : options.onRowDoubleClick;
    if (!handler || (event.target as HTMLElement).closest(INTERACTIVE)) return;
    handler(row.original, event);
  };

  const renderCell = (item: ColumnLayoutItem<T>): ReactNode => (
    <Cell
      key={item.column.id}
      row={row}
      rowIndex={rowIndex}
      item={item}
      active={activeCol === item.visibleIndex}
      editing={editingColumn === item.column.id}
      pendingValue={pending && item.column.id in pending ? pending[item.column.id] : NO_PENDING}
      error={errors?.[item.column.id]}
      selected={selected}
      selectable={selectable}
    />
  );

  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      aria-selected={features.selection ? selected : undefined}
      className={cx("dg-row", classNames.row, className)}
      style={{ transform: `translateY(${top}px)` }}
      data-row-index={rowIndex}
      data-odd={rowIndex % 2 === 1 || undefined}
      data-selected={selected || undefined}
      onClick={(event) => handleClick(event, "click")}
      onDoubleClick={(event) => handleClick(event, "double")}
    >
      {layout.left.map(renderCell)}
      {colRange.start > 0 && (
        <div className="dg-spacer" style={{ width: layout.center[colRange.start].offset }} aria-hidden="true" />
      )}
      {layout.center.slice(colRange.start, colRange.end).map(renderCell)}
      <div className="dg-spacer dg-spacer-fill" aria-hidden="true" />
      {layout.right.map(renderCell)}
    </div>
  );
}

export const Row = memo(RowView) as typeof RowView;
