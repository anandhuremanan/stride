import type { SpinnerSize, VisibilityMarks, VisibilityOptions, VisibilityStep } from "./types";

/**
 * Whether a spinner should be on screen right now. A short `delay` hides work
 * that finishes quickly; a `minDuration` keeps a spinner that did appear from
 * vanishing a moment later. Both avoid the flicker of a spinner that blinks.
 */
export function stepVisibility(
  loading: boolean,
  marks: VisibilityMarks,
  now: number,
  options: VisibilityOptions = {},
): VisibilityStep {
  const delay = Math.max(0, options.delay ?? 0);
  const minDuration = Math.max(0, options.minDuration ?? 0);

  if (loading && !marks.visible) {
    const waited = now - (marks.loadingSince ?? now);
    return waited >= delay ? { visible: true, recheckIn: null } : { visible: false, recheckIn: delay - waited };
  }
  if (!loading && marks.visible) {
    const shown = now - (marks.visibleSince ?? now);
    return shown >= minDuration
      ? { visible: false, recheckIn: null }
      : { visible: true, recheckIn: minDuration - shown };
  }
  return { visible: marks.visible, recheckIn: null };
}

const SIZES: Record<SpinnerSize, number> = { xs: 12, sm: 16, md: 24, lg: 32, xl: 48 };

/** Pixel size for a named size; numbers pass through. */
export const spinnerPixels = (size: SpinnerSize | number = "md") =>
  typeof size === "number" ? Math.max(1, size) : SIZES[size];
