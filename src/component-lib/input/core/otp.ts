import type { OtpMode } from "./types";

const ALLOWED: Record<OtpMode, RegExp> = {
  numeric: /^\d$/,
  alphanumeric: /^[a-z0-9]$/i,
  alphabetic: /^[a-z]$/i,
};

/**
 * Keeps the characters a code may contain, up to `length`. Pasting
 * `"Your code: 123-456"` into a numeric field gives `"123456"`.
 */
export function sanitizeOtp(
  input: string,
  length: number,
  mode: OtpMode = "numeric",
  uppercase = false,
): string {
  let result = "";
  for (const char of input) {
    if (result.length >= length) break;
    if (ALLOWED[mode].test(char)) result += uppercase ? char.toUpperCase() : char;
  }
  return result;
}

/** Numeric codes get the phone's number pad. */
export const otpInputMode = (mode: OtpMode): "numeric" | "text" =>
  mode === "numeric" ? "numeric" : "text";

/** A `pattern` attribute, so native form validation knows a complete code. */
export function otpPattern(mode: OtpMode, length: number): string {
  const characters =
    mode === "numeric" ? "\\d" : mode === "alphabetic" ? "[A-Za-z]" : "[A-Za-z0-9]";
  return `${characters}{${length}}`;
}

/** Cell indexes followed by a separator, from group sizes such as `[3, 3]`. */
export function separatorsAfter(groups: readonly number[] | undefined, length: number): Set<number> {
  const result = new Set<number>();
  if (!groups) return result;
  let position = 0;
  for (const size of groups.slice(0, -1)) {
    position += size;
    if (position > 0 && position < length) result.add(position - 1);
  }
  return result;
}

/**
 * The cell showing the caret: where the next character goes, or, once the code
 * is full, the character that typing will replace.
 */
export function activeCell(valueLength: number, length: number, caret: number): number {
  return Math.max(0, Math.min(caret, valueLength, length - 1));
}

/** The cell under a horizontal position, given each cell's left and right edges. */
export function cellAt(bounds: readonly { left: number; right: number }[], x: number): number {
  for (let index = 0; index < bounds.length; index++) {
    if (x <= bounds[index].right) return index;
  }
  return Math.max(0, bounds.length - 1);
}
