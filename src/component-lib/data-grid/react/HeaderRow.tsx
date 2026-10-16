"use client";

import {
  useMemo,
  useRef,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { isFilterActive } from "../core/filtering";
import type { ColumnFilter, ColumnLayout, ColumnLayoutItem, GridRow, RowId, SortItem } from "../core/types";
import type { Range } from "../core/virtual";
import { cx, useGridContext } from "./context";
import { useFocusWhenActive, useSelectionState, useStoreSelector } from "./hooks";
import { ArrowDownIcon, ArrowUpIcon, MoreIcon } from "./icons";

const NO_ACTIVE_CELL = -2;

interface HeaderRowProps<T> {
  layout: ColumnLayout<T>;
  colRange: Range;
  sorting: SortItem[];
  filters: ColumnFilter[];
  /** Rows the select-all checkbox acts on. */
  rows: GridRow<T>[];
}

export function HeaderRow<T>({ layout, colRange, sorting, filters, rows }: HeaderRowProps<T>) {
  const { engine, classNames } = useGridContext<T>();
  const activeCol = useStoreSelector(engine.store, (s) => {
    const active = s.ui.activeCell;
    return active === null ? NO_ACTIVE_CELL : active.rowIndex === -1 ? active.colIndex : -1;
  });

  const render = (item: ColumnLayoutItem<T>): ReactNode => {
    const active = activeCol === item.visibleIndex;
    // Before anything is focused, the first header cell is the grid's tab stop.
    const tabbable = active || (activeCol === NO_ACTIVE_CELL && item.visibleIndex === 0);
    if (item.column.internal) {
      return (
        <SelectAllHeaderCell key={item.column.id} item={item} rows={rows} active={active} tabbable={tabbable} />
      );
    }
    const sortIndex = sorting.findIndex((s) => s.columnId === item.column.id);
    return (
      <HeaderCell
        key={item.column.id}
        item={item}
        active={active}
        tabbable={tabbable}
        sort={sortIndex === -1 ? undefined : sorting[sortIndex]}
        sortOrder={sorting.length > 1 ? sortIndex + 1 : 0}
        filtered={filters.some((f) => f.columnId === item.column.id && isFilterActive(f))}
      />
    );
  };

  return (
    <div role="rowgroup" className="dg-header-group">
      <div role="row" aria-rowindex={1} className={cx("dg-header", classNames.header)} data-row-index={-1}>
        {layout.left.map(render)}
        {colRange.start > 0 && (
          <div className="dg-spacer" style={{ width: layout.center[colRange.start].offset }} aria-hidden="true" />
        )}
        {layout.center.slice(colRange.start, colRange.end).map(render)}
        <div className="dg-spacer dg-spacer-fill" aria-hidden="true" />
        {layout.right.map(render)}
      </div>
    </div>
  );
}

interface HeaderCellProps<T> {
  item: ColumnLayoutItem<T>;
  active: boolean;
  tabbable: boolean;
  sort: SortItem | undefined;
  /** 1-based position in a multi-column sort, 0 otherwise. */
  sortOrder: number;
  filtered: boolean;
}

function HeaderCell<T>({ item, active, tabbable, sort, sortOrder, filtered }: HeaderCellProps<T>) {
  const { engine, locale, classNames, features, openColumnMenu } = useGridContext<T>();
  const ref = useRef<HTMLDivElement>(null);
  useFocusWhenActive(ref, active);

  const { column } = item;
  const sortable = features.sorting && column.sortable;
  const resizable = features.resizing && column.resizable;
  const reorderable = features.reordering && column.reorderable;
  const hasMenu =
    sortable ||
    reorderable ||
    (features.filtering && column.filterable) ||
    (features.pinning && column.pinnable) ||
    (features.hiding && column.hideable);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    engine.setActiveCell(-1, item.visibleIndex, { focus: false, scroll: false });
    const fromControl = (event.target as HTMLElement).closest("button, .dg-resize-handle");
    if (sortable && !fromControl) engine.api.toggleSort(column.id, event.shiftKey);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !hasMenu) return;
    if ((event.altKey && event.key === "ArrowDown") || event.key === "ContextMenu") {
      event.preventDefault();
      event.stopPropagation();
      openColumnMenu(column.id, event.currentTarget);
    }
  };

  const startResize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const root = handle.closest<HTMLElement>(".dg-root");
    const direction = getComputedStyle(handle).direction === "rtl" ? -1 : 1;
    const startX = event.clientX;
    let width = item.width;

    handle.setPointerCapture(event.pointerId);
    root?.setAttribute("data-resizing", "");

    const onMove = (move: globalThis.PointerEvent) => {
      const next = item.width + (move.clientX - startX) * direction;
      width = Math.round(Math.min(column.maxWidth, Math.max(column.minWidth, next)));
      engine.previewColumnWidth(column.id, width);
    };

    /**
     * Ends the drag. `keep` false is the Escape path: the preview is only CSS
     * variables on the viewport, so writing the original width back is the whole
     * undo, and nothing ever reaches the grid's state.
     */
    const finish = (keep: boolean) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onPointerEnd);
      handle.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("keydown", onEscape, true);
      root?.removeAttribute("data-resizing");
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (keep) {
        if (width !== item.width) engine.api.setColumnWidth(column.id, width);
      } else {
        engine.previewColumnWidth(column.id, item.width);
      }
    };

    const onPointerEnd = () => finish(true);

    // Capture, and on the document: the pointer is captured by the handle, so
    // the keyboard is still wherever it was. Escape is swallowed so abandoning a
    // resize inside a dialog does not also close the dialog.
    const onEscape = (key: globalThis.KeyboardEvent) => {
      if (key.key !== "Escape") return;
      key.preventDefault();
      key.stopPropagation();
      finish(false);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onPointerEnd);
    handle.addEventListener("pointercancel", onPointerEnd);
    document.addEventListener("keydown", onEscape, true);
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest(".dg-resize-handle")) {
      event.preventDefault();
      return;
    }
    engine.setDraggingColumn(column.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", column.header);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    const dragging = engine.getDraggingColumn();
    if (!dragging || dragging === column.id) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const firstHalf = event.clientX < rect.left + rect.width / 2;
    event.currentTarget.dataset.drop = firstHalf !== rtl ? "before" : "after";
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    delete event.currentTarget.dataset.drop;
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    const dragging = engine.getDraggingColumn();
    const placement = event.currentTarget.dataset.drop;
    delete event.currentTarget.dataset.drop;
    if (!dragging || (placement !== "before" && placement !== "after")) return;
    event.preventDefault();
    engine.api.moveColumn(dragging, column.id, placement);
  };

  return (
    <div
      ref={ref}
      role="columnheader"
      aria-colindex={item.visibleIndex + 1}
      aria-sort={sort ? (sort.desc ? "descending" : "ascending") : sortable ? "none" : undefined}
      tabIndex={tabbable ? 0 : -1}
      className={cx("dg-header-cell", classNames.headerCell, column.def.headerClassName)}
      style={item.style}
      data-col-index={item.visibleIndex}
      data-pinned={item.pinned || undefined}
      data-pin-edge={item.pinEdge || undefined}
      data-align={column.align}
      data-sortable={sortable || undefined}
      data-active={active || undefined}
      draggable={reorderable}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragStart={reorderable ? onDragStart : undefined}
      onDragOver={reorderable ? onDragOver : undefined}
      onDragLeave={reorderable ? onDragLeave : undefined}
      onDrop={reorderable ? onDrop : undefined}
      onDragEnd={reorderable ? () => engine.setDraggingColumn(null) : undefined}
    >
      <span className="dg-header-label" title={column.header}>
        {column.header}
      </span>
      {sort && (
        <span className="dg-sort-indicator" aria-hidden="true">
          {sort.desc ? <ArrowDownIcon width={14} height={14} /> : <ArrowUpIcon width={14} height={14} />}
          {sortOrder > 0 && <span className="dg-sort-order">{sortOrder}</span>}
        </span>
      )}
      {filtered && (
        <>
          <span className="dg-filter-dot" aria-hidden="true" />
          <span className="dg-sr-only">{locale.filtered}</span>
        </>
      )}
      {hasMenu && (
        <button
          type="button"
          tabIndex={-1}
          className="dg-icon-button dg-header-menu"
          aria-label={locale.columnMenu(column.header)}
          aria-haspopup="dialog"
          onClick={(event) => {
            event.stopPropagation();
            openColumnMenu(column.id, event.currentTarget);
          }}
        >
          <MoreIcon />
        </button>
      )}
      {resizable && (
        <div
          className="dg-resize-handle"
          aria-hidden="true"
          draggable={false}
          onPointerDown={startResize}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => {
            event.stopPropagation();
            engine.api.setColumnWidth(column.id, null);
          }}
        />
      )}
    </div>
  );
}

interface SelectAllHeaderCellProps<T> {
  item: ColumnLayoutItem<T>;
  rows: GridRow<T>[];
  active: boolean;
  tabbable: boolean;
}

function SelectAllHeaderCell<T>({ item, rows, active, tabbable }: SelectAllHeaderCellProps<T>) {
  const { engine, locale, classNames, features, isRowSelectable } = useGridContext<T>();
  const ref = useRef<HTMLDivElement>(null);
  useFocusWhenActive(ref, active);

  const selection = useSelectionState<T, Record<RowId, boolean>>((s) => s);
  const status = useMemo(() => {
    let selectable = 0;
    let selected = 0;
    for (const row of rows) {
      if (!isRowSelectable(row.original)) continue;
      selectable++;
      if (selection[row.id]) selected++;
    }
    return selected === 0 ? "none" : selected === selectable ? "all" : "some";
  }, [rows, selection, isRowSelectable]);

  return (
    <div
      ref={ref}
      role="columnheader"
      aria-colindex={item.visibleIndex + 1}
      tabIndex={tabbable ? 0 : -1}
      className={cx("dg-header-cell", classNames.headerCell)}
      style={item.style}
      data-col-index={item.visibleIndex}
      data-pinned="left"
      data-pin-edge={item.pinEdge || undefined}
      data-align="center"
      data-active={active || undefined}
      onClick={() => engine.setActiveCell(-1, item.visibleIndex, { focus: false, scroll: false })}
    >
      {features.selectionMode === "multiple" ? (
        <input
          type="checkbox"
          className="dg-checkbox"
          tabIndex={-1}
          aria-label={locale.selectAllRows}
          checked={status === "all"}
          ref={(el) => {
            if (el) el.indeterminate = status === "some";
          }}
          onChange={() => engine.api.toggleAllRowsSelected(status !== "all")}
        />
      ) : (
        <span className="dg-sr-only">{locale.selectRow}</span>
      )}
    </div>
  );
}
