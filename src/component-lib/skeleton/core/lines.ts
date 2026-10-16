/**
 * The widths of the placeholder lines in a block of text.
 *
 * Real paragraphs do not end flush with the margin, so the last line is drawn
 * short. One line is left full width: a single short bar reads as a label, not
 * as a sentence still loading.
 */
export function lineWidths(lines: number, lastLineWidth = 60): string[] {
  const count = Math.max(0, Math.floor(lines));
  if (count === 0) return [];
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 && count > 1 ? `${clampPercent(lastLineWidth)}%` : "100%",
  );
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(100, Math.max(10, value));
}

/** A CSS length from a number of pixels or a string that is already one. */
export function toLength(value: number | string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}
