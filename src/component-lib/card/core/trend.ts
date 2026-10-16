export type TrendDirection = "up" | "down" | "flat";

/** Whether a change counts as a rise, a fall, or no real movement. */
export function trendDirection(change: number, threshold = 0): TrendDirection {
  if (!Number.isFinite(change)) return "flat";
  if (change > threshold) return "up";
  if (change < -threshold) return "down";
  return "flat";
}

/**
 * Whether a direction should be drawn as good news.
 *
 * Up is usually good, but not for churn, refunds or error rates, so `invert`
 * flips it. Colour alone never carries the meaning: the arrow and the label do
 * too.
 */
export function isPositive(direction: TrendDirection, invert = false): boolean | null {
  if (direction === "flat") return null;
  return invert ? direction === "down" : direction === "up";
}

/**
 * A change as a percentage of where it started.
 *
 * Returns null when there is nothing to compare against: growth from zero is
 * not "infinite percent", it is simply not a percentage.
 */
export function percentChange(from: number, to: number): number | null {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}
