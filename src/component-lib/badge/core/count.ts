/**
 * The label a counter shows, and the one a screen reader hears.
 *
 * A badge is small, so a number that keeps growing has to stop somewhere —
 * but "99+" read aloud as "ninety-nine plus" is a guess, not a count, which is
 * why the two strings are computed together and the spoken one says what it
 * means.
 */
export interface CountLabel {
  /** What is printed in the badge. */
  text: string;
  /** What assistive technology reads instead, when the two differ. */
  spoken?: string;
}

export function formatCount(
  count: number,
  max = 99,
  format?: (value: number) => string,
): CountLabel {
  const show = (value: number) => (format ? format(value) : String(value));
  if (!Number.isFinite(count)) return { text: "" };
  const whole = Math.trunc(count);
  if (whole <= max) return { text: show(whole) };
  return { text: `${show(max)}+`, spoken: `more than ${show(max)}` };
}

/**
 * Whether a counter should be on the page at all.
 *
 * Zero is the interesting case: a badge reading "0" is noise on a page and a
 * spurious announcement in a screen reader, so it is left off unless the caller
 * asks for it — but a caller sometimes does, when the number sits in a table of
 * numbers and a gap would read as missing data.
 */
export const showCount = (count: number, showZero = false): boolean =>
  Number.isFinite(count) && (count > 0 || (showZero && count === 0));
