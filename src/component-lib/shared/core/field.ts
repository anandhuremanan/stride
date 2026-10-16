import { cx } from "./cx";

export interface DescribedByParts {
  /** An `aria-describedby` the caller passed in; kept first so it reads first. */
  extra?: string;
  /** Renders `#{id}-hint`. */
  hint?: unknown;
  /** Renders `#{id}-description`. */
  description?: unknown;
  /** Renders `#{id}-error`. */
  error?: unknown;
}

/**
 * The `aria-describedby` for a form control, built from whichever of its hint,
 * description and error are actually rendered.
 *
 * Every control derives the ids the same way (`{id}-description`, `{id}-error`),
 * so the helper owns both the ids and their order: a screen reader reads the
 * caller's own description first, then the hint, then ours, and the error last,
 * which is the part that changes and that the listener is waiting for.
 *
 * Returns `undefined` rather than `""` when nothing is described, because an
 * empty `aria-describedby` still points at nothing and confuses some readers.
 */
export function describeField(id: string, parts: DescribedByParts): string | undefined {
  return (
    cx(
      typeof parts.extra === "string" ? parts.extra : "",
      parts.hint ? `${id}-hint` : "",
      parts.description ? `${id}-description` : "",
      parts.error ? `${id}-error` : "",
    ) || undefined
  );
}
