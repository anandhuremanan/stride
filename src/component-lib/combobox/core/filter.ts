import type {
  ComboboxOption,
  ListItem,
  MatchRange,
  OptionEntry,
  OptionValue,
} from "./types";

/** Ranges of `text` matching every search term, or null when one term is missing. */
export function matchRanges(text: string, terms: readonly string[]): MatchRange[] | null {
  if (terms.length === 0) return [];
  const haystack = text.toLocaleLowerCase();
  const ranges: MatchRange[] = [];
  for (const term of terms) {
    const start = haystack.indexOf(term);
    if (start === -1) return null;
    ranges.push([start, start + term.length]);
  }
  return mergeRanges(ranges);
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: MatchRange[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

export const splitTerms = (search: string) =>
  search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

/**
 * Filters options by search text. The label is matched first; description and
 * keywords also match but are not highlighted.
 */
export function filterOptions<V extends OptionValue>(
  options: readonly ComboboxOption<V>[],
  search: string,
  filterFn?: (option: ComboboxOption<V>, search: string) => boolean,
): OptionEntry<V>[] {
  const terms = splitTerms(search);
  if (terms.length === 0 && !filterFn) {
    return options.map((option) => ({ option, matches: [] }));
  }

  const entries: OptionEntry<V>[] = [];
  for (const option of options) {
    if (filterFn) {
      if (filterFn(option, search)) entries.push({ option, matches: matchRanges(option.label, terms) ?? [] });
      continue;
    }
    const labelMatches = matchRanges(option.label, terms);
    if (labelMatches) {
      entries.push({ option, matches: labelMatches });
      continue;
    }
    const extra = [option.description, ...(option.keywords ?? [])].filter(Boolean).join(" ");
    if (extra && matchRanges(extra, terms)) entries.push({ option, matches: [] });
  }
  return entries;
}

/** Adds group headings, keeping the order in which groups first appear. */
export function buildListItems<V extends OptionValue>(entries: readonly OptionEntry<V>[]): ListItem<V>[] {
  const hasGroups = entries.some((entry) => entry.option.group);
  if (!hasGroups) {
    return entries.map((entry, index) => ({ kind: "option", entry, index }));
  }

  const groups = new Map<string, OptionEntry<V>[]>();
  for (const entry of entries) {
    const key = entry.option.group ?? "";
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }

  const items: ListItem<V>[] = [];
  let index = 0;
  for (const [group, list] of groups) {
    if (group) items.push({ kind: "group", label: group });
    for (const entry of list) items.push({ kind: "option", entry, index: index++ });
  }
  return items;
}

/** Next selectable option index, skipping disabled options. Wraps around. */
export function nextEnabledIndex<V extends OptionValue>(
  entries: readonly OptionEntry<V>[],
  from: number,
  delta: number,
): number {
  const count = entries.length;
  if (count === 0) return -1;
  let index = from;
  for (let step = 0; step < count; step++) {
    index = index + delta;
    if (index < 0) index = count - 1;
    if (index >= count) index = 0;
    if (!entries[index].option.disabled) return index;
  }
  return -1;
}

/** First selectable option at or after `from` (searching forward, no wrap). */
export function firstEnabledIndex<V extends OptionValue>(
  entries: readonly OptionEntry<V>[],
  from = 0,
): number {
  for (let index = Math.max(0, from); index < entries.length; index++) {
    if (!entries[index].option.disabled) return index;
  }
  for (let index = Math.min(from, entries.length) - 1; index >= 0; index--) {
    if (!entries[index].option.disabled) return index;
  }
  return -1;
}

export function lastEnabledIndex<V extends OptionValue>(entries: readonly OptionEntry<V>[]): number {
  for (let index = entries.length - 1; index >= 0; index--) {
    if (!entries[index].option.disabled) return index;
  }
  return -1;
}

/** Adds or removes a value, respecting `max` (ignored when removing). */
export function toggleValue<V extends OptionValue>(
  values: readonly V[],
  value: V,
  max?: number,
): V[] {
  if (values.includes(value)) return values.filter((v) => v !== value);
  if (max !== undefined && values.length >= max) return [...values];
  return [...values, value];
}

/** Index of the first option matching a typed prefix, for type-ahead. */
export function findByPrefix<V extends OptionValue>(
  entries: readonly OptionEntry<V>[],
  prefix: string,
  from: number,
): number {
  const needle = prefix.toLocaleLowerCase();
  const count = entries.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step + count) % count;
    const { option } = entries[index];
    if (!option.disabled && option.label.toLocaleLowerCase().startsWith(needle)) return index;
  }
  return -1;
}
