import type { ReactNode } from "react";

export type OptionValue = string | number;

export interface ComboboxOption<V extends OptionValue = string> {
  value: V;
  label: string;
  /** Secondary line shown under the label. */
  description?: string;
  /** Options with the same group are listed under one heading. */
  group?: string;
  disabled?: boolean;
  /** Rendered before the label. */
  icon?: ReactNode;
  /** Extra text the search should match (synonyms, codes). */
  keywords?: string[];
}

/** Character range of a search hit, used to highlight the label. */
export type MatchRange = [start: number, end: number];

export interface OptionEntry<V extends OptionValue = string> {
  option: ComboboxOption<V>;
  /** Ranges in `option.label` that matched the search. */
  matches: MatchRange[];
}

/** One row of the rendered list: a group heading or an option. */
export type ListItem<V extends OptionValue = string> =
  | { kind: "group"; label: string }
  | { kind: "option"; entry: OptionEntry<V>; index: number };

export type ComboboxSize = "sm" | "md" | "lg";

export interface ComboboxLocaleText {
  searchPlaceholder: string;
  noResults: string;
  loading: string;
  loadMore: string;
  clear: string;
  clearAll: string;
  selectAll: string;
  createOption(label: string): string;
  selectedCount(count: string): string;
  moreCount(count: string): string;
  removeOption(label: string): string;
  maxReached(max: string): string;
}
