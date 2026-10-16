import type { BoxMetrics } from "./types";

/** Border-box height that shows exactly `rows` lines of text. */
export function heightForRows(rows: number, metrics: BoxMetrics): number {
  return rows * metrics.lineHeight + metrics.paddingBlock + metrics.borderBlock;
}

/**
 * The height that fits the content between `minRows` and `maxRows`, and whether
 * the content is taller than that (so the textarea should scroll).
 * `scrollHeight` is the element's, which includes padding but not borders.
 */
export function fitHeight(
  scrollHeight: number,
  metrics: BoxMetrics,
  minRows: number,
  maxRows?: number,
): { height: number; overflow: boolean } {
  const content = scrollHeight + metrics.borderBlock;
  const min = heightForRows(Math.max(1, minRows), metrics);
  const max = maxRows ? Math.max(min, heightForRows(maxRows, metrics)) : Infinity;
  return { height: Math.min(Math.max(content, min), max), overflow: content > max };
}
