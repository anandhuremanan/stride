import type { ColumnLayout } from "./types";

export interface Viewport {
  scrollTop: number;
  scrollLeft: number;
  width: number;
  height: number;
}

/** Half-open range: `start` inclusive, `end` exclusive. */
export interface Range {
  start: number;
  end: number;
}

export interface VisibleRange {
  rows: Range;
  columns: Range;
}

export function getRowRange(
  viewport: Viewport,
  rowCount: number,
  rowHeight: number,
  headerHeight: number,
  overscan = 6,
): Range {
  if (rowCount === 0) return { start: 0, end: 0 };
  const bodyHeight = Math.max(0, viewport.height - headerHeight);
  const first = Math.floor(viewport.scrollTop / rowHeight);
  const last = Math.ceil((viewport.scrollTop + bodyHeight) / rowHeight);
  return {
    start: Math.max(0, Math.min(rowCount, first) - overscan),
    end: Math.min(rowCount, last + overscan),
  };
}

/** Range of center (unpinned) columns intersecting the viewport. */
export function getColumnRange<T>(
  layout: ColumnLayout<T>,
  viewport: Viewport,
  overscan = 2,
): Range {
  const { center } = layout;
  const count = center.length;
  // Width is unknown before the first measurement (and during SSR): render everything.
  if (count === 0 || viewport.width === 0) return { start: 0, end: count };

  // Browsers report negative scrollLeft in RTL.
  const windowStart = Math.abs(viewport.scrollLeft);
  const windowEnd =
    windowStart + Math.max(0, viewport.width - layout.leftWidth - layout.rightWidth);

  // First column whose right edge is past windowStart.
  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (center[mid].offset + center[mid].width <= windowStart) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;

  // First column starting at or past windowEnd.
  hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (center[mid].offset < windowEnd) lo = mid + 1;
    else hi = mid;
  }

  return {
    start: Math.max(0, start - overscan),
    end: Math.min(count, Math.max(lo, start + 1) + overscan),
  };
}

export function visibleRangeEqual(a: VisibleRange, b: VisibleRange): boolean {
  return (
    a.rows.start === b.rows.start &&
    a.rows.end === b.rows.end &&
    a.columns.start === b.columns.start &&
    a.columns.end === b.columns.end
  );
}
