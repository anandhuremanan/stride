import type { CheckedState } from "./types";

/** Adds or removes one value, keeping the order values were selected in. */
export function toggleValue(values: readonly string[], value: string, checked: boolean): string[] {
  const has = values.includes(value);
  if (checked) return has ? [...values] : [...values, value];
  return values.filter((item) => item !== value);
}

/** A "select all" box's state for the options in a group. */
export function groupState(values: readonly string[], options: readonly { value: string }[]): CheckedState {
  if (options.length === 0) return false;
  const selected = options.filter((option) => values.includes(option.value)).length;
  if (selected === 0) return false;
  return selected === options.length ? true : "indeterminate";
}

/**
 * What "select all" does: when every enabled option is already selected, clear
 * them; otherwise select them all. Disabled options keep their state either way.
 */
export function toggleAll(
  values: readonly string[],
  options: readonly { value: string; disabled?: boolean }[],
): string[] {
  const enabled = options.filter((option) => !option.disabled).map((option) => option.value);
  const allOn = enabled.every((value) => values.includes(value));
  if (allOn) return values.filter((value) => !enabled.includes(value));
  return [...values, ...enabled.filter((value) => !values.includes(value))];
}
