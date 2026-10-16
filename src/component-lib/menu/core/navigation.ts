/** How long a run of keystrokes counts as one word for typeahead. */
export const TYPEAHEAD_RESET_MS = 700;

export interface NavigableItem {
  /** Disabled items are skipped by the keyboard, as WAI-ARIA's menu pattern allows. */
  disabled?: boolean;
  /** The visible text, lowercased by the caller or not — matching ignores case. */
  text?: string;
}

/**
 * The next item to focus from `from`, stepping by `step` and skipping disabled
 * items. Wraps around, which is what a menu does and a listbox does not.
 *
 * Returns -1 when every item is disabled, so callers can leave focus alone
 * rather than moving it somewhere meaningless.
 */
export function nextIndex(items: readonly NavigableItem[], from: number, step: number): number {
  if (items.length === 0) return -1;
  // Nothing focused yet: Down starts at the top, Up at the bottom.
  if (from < 0) return edgeIndex(items, step > 0 ? "first" : "last");
  for (let moved = 1; moved <= items.length; moved += 1) {
    const index = (from + step * moved + items.length * moved) % items.length;
    if (!items[index]?.disabled) return index;
  }
  return -1;
}

/** The first or last item that can be focused. */
export function edgeIndex(items: readonly NavigableItem[], edge: "first" | "last"): number {
  const order = edge === "first" ? items.keys() : [...items.keys()].reverse();
  for (const index of order) {
    if (!items[index]?.disabled) return index;
  }
  return -1;
}

/**
 * The item a typed string should jump to, searching from just after `from` and
 * wrapping, so repeating a letter cycles through the items starting with it.
 *
 * Returns -1 when nothing matches, leaving focus where it is rather than
 * jumping somewhere unrelated.
 */
export function typeaheadIndex(
  items: readonly NavigableItem[],
  query: string,
  from: number,
): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return -1;

  // A repeated single letter cycles; anything longer is a prefix search from
  // the current item, so "sa" after "s" refines instead of jumping on.
  const repeated = needle.length > 1 && [...needle].every((character) => character === needle[0]);
  const search = repeated ? needle[0] : needle;
  const start = repeated || needle.length === 1 ? from + 1 : from;

  for (let offset = 0; offset < items.length; offset += 1) {
    const index = (start + offset + items.length) % items.length;
    const item = items[index];
    if (item?.disabled) continue;
    if ((item?.text ?? "").trim().toLowerCase().startsWith(search)) return index;
  }
  return -1;
}

/**
 * Collects the buffer for typeahead: keystrokes within `TYPEAHEAD_RESET_MS` of
 * each other build a word, and a longer pause starts a new one.
 */
export function typeaheadBuffer(
  previous: string,
  key: string,
  elapsedMs: number,
  resetMs: number = TYPEAHEAD_RESET_MS,
): string {
  return elapsedMs > resetMs ? key : previous + key;
}

/** Whether a key should be added to the typeahead buffer rather than handled. */
export function isTypeaheadKey(key: string, modified: boolean): boolean {
  return !modified && key.length === 1 && key !== " " && /\S/.test(key);
}
