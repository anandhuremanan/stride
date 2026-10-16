import type { ListItem, OptionValue } from "./types";

export interface ItemSizes {
  option: number;
  group: number;
}

export interface ListMetrics {
  /** Offset of each item, plus the total height as the last entry. */
  offsets: number[];
  total: number;
}

export function measureItems<V extends OptionValue>(
  items: readonly ListItem<V>[],
  sizes: ItemSizes,
): ListMetrics {
  const offsets = new Array<number>(items.length + 1);
  let offset = 0;
  for (let i = 0; i < items.length; i++) {
    offsets[i] = offset;
    offset += items[i].kind === "group" ? sizes.group : sizes.option;
  }
  offsets[items.length] = offset;
  return { offsets, total: offset };
}

export interface Range {
  start: number;
  end: number;
}

/** Items intersecting the visible window, plus overscan. */
export function getVisibleRange(metrics: ListMetrics, scrollTop: number, height: number, overscan = 4): Range {
  const count = metrics.offsets.length - 1;
  if (count === 0 || height === 0) return { start: 0, end: count };

  const find = (position: number) => {
    let lo = 0;
    let hi = count;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (metrics.offsets[mid + 1] <= position) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const start = find(scrollTop);
  const end = find(scrollTop + height) + 1;
  return { start: Math.max(0, start - overscan), end: Math.min(count, end + overscan) };
}

/** Scroll position that brings an item fully into view, or null if it already is. */
export function scrollToItem(
  metrics: ListMetrics,
  itemIndex: number,
  scrollTop: number,
  height: number,
): number | null {
  const top = metrics.offsets[itemIndex];
  const bottom = metrics.offsets[itemIndex + 1];
  if (top === undefined || bottom === undefined) return null;
  if (top < scrollTop) return top;
  if (bottom > scrollTop + height) return bottom - height;
  return null;
}
