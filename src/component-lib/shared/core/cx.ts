/**
 * Joins class names, dropping anything falsy.
 *
 * Every component builds its class strings with this, so a `className` or
 * `classNames` prop that is `undefined` contributes nothing rather than the
 * string "undefined".
 */
export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");
