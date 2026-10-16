import type { ProgressState } from "./types";

/**
 * What a progress bar knows about itself.
 *
 * Kept apart from the component because the two interesting cases are easy to
 * get wrong and invisible when you do: a value of `null` is *unknown*, not
 * zero, and a `max` of zero is a task with nothing in it, which must not become
 * a division by zero shown as `NaN%`.
 */
export function describeProgress(
  value: number | null | undefined,
  max = 100,
): ProgressState {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { indeterminate: true, value: null, fraction: 0, percent: 0 };
  }
  const top = Number.isFinite(max) && max > 0 ? max : 0;
  const clamped = Math.min(Math.max(value, 0), top || value);
  const fraction = top === 0 ? 0 : clamped / top;
  return {
    indeterminate: false,
    value: clamped,
    fraction,
    // Rounded for display only; the bar itself is drawn from `fraction`, so a
    // 99.6% bar does not snap to full while the last bytes are still moving.
    percent: Math.round(fraction * 100),
  };
}

/**
 * A step counter's fraction: "step 2 of 5" is 40%, not 20%.
 *
 * Off-by-one here is the classic wizard bug — the first step showing an empty
 * bar, or the last showing one still short of full.
 */
export function stepFraction(step: number, total: number): number {
  if (!Number.isFinite(step) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(Math.max(step, 0), total) / total;
}
