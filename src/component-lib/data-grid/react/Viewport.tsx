"use client";

import { useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode, type UIEvent } from "react";
import { getLayoutVars } from "../core/columns";
import type { PageResult } from "../core/rows";
import type { ColumnFilter, ColumnLayout, GridRow, SortItem } from "../core/types";
import { getColumnRange, getRowRange, visibleRangeEqual, type VisibleRange } from "../core/virtual";
import { cx, useGridContext } from "./context";
import { HeaderRow } from "./HeaderRow";
import { useStoreSelector } from "./hooks";
import { handleGridKeyDown } from "./keyboard";
import { Row } from "./Row";

interface GridViewportProps<T> {
  layout: ColumnLayout<T>;
  page: PageResult<T>;
  sortedRows: GridRow<T>[];
  sorting: SortItem[];
  filters: ColumnFilter[];
  hasQuery: boolean;
  rowHeight: number;
  headerHeight: number;
  height: number | string | undefined;
  loading: boolean;
  emptyState: ReactNode;
  ariaLabel: string;
  getRowClassName: ((row: T, rowIndex: number) => string | undefined) | undefined;
}

export function GridViewport<T>({
  layout,
  page,
  sortedRows,
  sorting,
  filters,
  hasQuery,
  rowHeight,
  headerHeight,
  height,
  loading,
  emptyState,
  ariaLabel,
  getRowClassName,
}: GridViewportProps<T>) {
  const { engine, locale, classNames, features } = useGridContext<T>();
  const ref = useRef<HTMLDivElement>(null);
  const rows = page.rows;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    engine.attachViewport(el);
    const measure = () =>
      engine.viewport.setState((v) =>
        v.width === el.clientWidth && v.height === el.clientHeight
          ? v
          : { ...v, width: el.clientWidth, height: el.clientHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      engine.attachViewport(null);
    };
  }, [engine]);

  // Re-renders only when the visible window of rows or columns changes.
  const range = useStoreSelector(
    engine.viewport,
    (v): VisibleRange => ({
      rows: getRowRange(v, rows.length, rowHeight, headerHeight),
      columns: getColumnRange(layout, v),
    }),
    visibleRangeEqual,
  );

  const active = useStoreSelector(engine.store, (s) => s.ui.activeCell);
  const activeItem = active ? layout.columns[active.colIndex] : undefined;
  const centerIndex = activeItem ? activeItem.visibleIndex - layout.left.length : -1;
  const activeRendered =
    !active ||
    (activeItem !== undefined &&
      (active.rowIndex === -1 || (active.rowIndex >= range.rows.start && active.rowIndex < range.rows.end)) &&
      (activeItem.pinned !== false || (centerIndex >= range.columns.start && centerIndex < range.columns.end)));

  const style = useMemo(
    () => ({ ...getLayoutVars(layout), height }) as CSSProperties,
    [layout, height],
  );

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollLeft } = event.currentTarget;
    engine.viewport.setState((v) =>
      v.scrollTop === scrollTop && v.scrollLeft === scrollLeft ? v : { ...v, scrollTop, scrollLeft },
    );
  };

  const rendered: ReactNode[] = [];
  for (let i = range.rows.start; i < Math.min(range.rows.end, rows.length); i++) {
    const row = rows[i];
    rendered.push(
      <Row
        key={row.id}
        row={row}
        rowIndex={i}
        ariaRowIndex={page.pageOffset + i + 2}
        top={i * rowHeight}
        layout={layout}
        colRange={range.columns}
        className={getRowClassName?.(row.original, i)}
      />,
    );
  }

  return (
    <div className="dg-viewport-wrap">
      <div
        ref={ref}
        role="grid"
        aria-label={ariaLabel}
        aria-rowcount={page.rowCount + 1}
        aria-colcount={layout.columns.length}
        aria-multiselectable={features.selection && features.selectionMode === "multiple" ? true : undefined}
        aria-busy={loading || undefined}
        // The active cell is the tab stop; if it is scrolled out of the DOM, the grid itself is.
        tabIndex={activeRendered ? -1 : 0}
        className={cx("dg-viewport", classNames.viewport)}
        style={style}
        onScroll={onScroll}
        onKeyDown={(event) => handleGridKeyDown(event, engine)}
        onFocus={(event) => {
          if (event.target === event.currentTarget && active && !activeRendered) {
            engine.setActiveCell(active.rowIndex, active.colIndex);
          }
        }}
      >
        <HeaderRow layout={layout} colRange={range.columns} sorting={sorting} filters={filters} rows={sortedRows} />
        <div role="rowgroup" className="dg-body" style={{ height: rows.length * rowHeight }}>
          {rendered}
        </div>
      </div>

      {rows.length === 0 && (
        <div className="dg-overlay" role="status">
          {loading
            ? locale.loading
            : (emptyState ?? (
                <div className="dg-empty">
                  <span>{hasQuery ? locale.noResults : locale.noRows}</span>
                  {hasQuery && (
                    <button type="button" className="dg-button" onClick={() => engine.api.clearFilters()}>
                      {locale.clearFilters}
                    </button>
                  )}
                </div>
              ))}
        </div>
      )}
      {loading && (
        <div className="dg-loading" aria-hidden="true">
          <div className="dg-loading-bar" />
        </div>
      )}
    </div>
  );
}
