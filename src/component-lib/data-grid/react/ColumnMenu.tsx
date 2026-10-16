"use client";

import type { ColumnFilter, ColumnLayout, ColumnLayoutItem, SortItem } from "../core/types";
import { useGridContext } from "./context";
import { FilterForm } from "./FilterForm";
import { ArrowDownIcon, ArrowUpIcon, EyeOffIcon, MoveIcon, PinIcon, XIcon } from "./icons";

interface ColumnMenuProps<T> {
  item: ColumnLayoutItem<T>;
  layout: ColumnLayout<T>;
  sort: SortItem | undefined;
  filter: ColumnFilter | undefined;
  onClose(): void;
}

export function ColumnMenu<T>({ item, layout, sort, filter, onClose }: ColumnMenuProps<T>) {
  const { engine, locale, features } = useGridContext<T>();
  const { api } = engine;
  const { column } = item;

  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  // Keyboard alternative to drag-and-drop: move within the column's own pin section.
  const section = (item.pinned === "left" ? layout.left : item.pinned === "right" ? layout.right : layout.center)
    .filter((i) => !i.column.internal);
  const position = section.findIndex((i) => i.column.id === column.id);
  const previous = section[position - 1];
  const next = section[position + 1];

  const canSort = features.sorting && column.sortable;
  const canPin = features.pinning && column.pinnable;
  const canMove = features.reordering && column.reorderable && (previous || next);
  const canHide = features.hiding && column.hideable;
  const canFilter = features.filtering && column.filterable;

  return (
    <div className="dg-column-menu">
      {canSort && (
        <div className="dg-menu-section">
          <button
            type="button"
            className="dg-menu-item"
            aria-pressed={sort?.desc === false}
            onClick={run(() => api.setSorting([{ columnId: column.id, desc: false }]))}
          >
            <ArrowUpIcon /> {locale.sortAscending}
          </button>
          <button
            type="button"
            className="dg-menu-item"
            aria-pressed={sort?.desc === true}
            onClick={run(() => api.setSorting([{ columnId: column.id, desc: true }]))}
          >
            <ArrowDownIcon /> {locale.sortDescending}
          </button>
          {sort && (
            <button
              type="button"
              className="dg-menu-item"
              onClick={run(() =>
                api.setSorting(api.getState().sorting.filter((s) => s.columnId !== column.id)),
              )}
            >
              <XIcon /> {locale.clearSort}
            </button>
          )}
        </div>
      )}

      {canPin && (
        <div className="dg-menu-section">
          {item.pinned !== "left" && (
            <button type="button" className="dg-menu-item" onClick={run(() => api.pinColumn(column.id, "left"))}>
              <PinIcon /> {locale.pinLeft}
            </button>
          )}
          {item.pinned !== "right" && (
            <button type="button" className="dg-menu-item" onClick={run(() => api.pinColumn(column.id, "right"))}>
              <PinIcon /> {locale.pinRight}
            </button>
          )}
          {item.pinned && (
            <button type="button" className="dg-menu-item" onClick={run(() => api.pinColumn(column.id, false))}>
              <XIcon /> {locale.unpin}
            </button>
          )}
        </div>
      )}

      {canMove && (
        <div className="dg-menu-section">
          {previous && (
            <button
              type="button"
              className="dg-menu-item"
              onClick={run(() => api.moveColumn(column.id, previous.column.id, "before"))}
            >
              <MoveIcon /> {locale.moveLeft}
            </button>
          )}
          {next && (
            <button
              type="button"
              className="dg-menu-item"
              onClick={run(() => api.moveColumn(column.id, next.column.id, "after"))}
            >
              <MoveIcon /> {locale.moveRight}
            </button>
          )}
        </div>
      )}

      {canHide && (
        <div className="dg-menu-section">
          <button
            type="button"
            className="dg-menu-item"
            onClick={run(() => api.setColumnVisibility(column.id, false))}
          >
            <EyeOffIcon /> {locale.hideColumn}
          </button>
        </div>
      )}

      {canFilter && (
        <div className="dg-menu-section">
          <FilterForm column={column} filter={filter} onDone={onClose} />
        </div>
      )}
    </div>
  );
}
