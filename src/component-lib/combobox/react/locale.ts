import type { ComboboxLocaleText } from "../core/types";

export const defaultComboboxText: ComboboxLocaleText = {
  searchPlaceholder: "Search…",
  noResults: "No options found",
  loading: "Loading…",
  loadMore: "Load more",
  clear: "Clear",
  clearAll: "Clear all",
  selectAll: "Select all",
  createOption: (label) => `Create “${label}”`,
  selectedCount: (count) => `${count} selected`,
  moreCount: (count) => `+${count} more`,
  removeOption: (label) => `Remove ${label}`,
  maxReached: (max) => `Maximum ${max} selected`,
};
