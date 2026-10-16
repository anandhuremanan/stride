"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  buildListItems,
  filterOptions,
  findByPrefix,
  firstEnabledIndex,
  lastEnabledIndex,
  matchRanges,
  nextEnabledIndex,
  splitTerms,
  toggleValue,
} from "../core/filter";
import type { ComboboxLocaleText, ComboboxOption, OptionValue } from "../core/types";
import type { ComboboxHandle } from "./props";

const TYPEAHEAD_RESET_MS = 700;
const PAGE_STEP = 10;

export interface UseComboboxParams<V extends OptionValue> {
  options: readonly ComboboxOption<V>[];
  multiple: boolean;
  /** Controlled values. `undefined` keeps them internal. */
  value?: V[];
  defaultValue: V[];
  onValuesChange(values: V[], options: ComboboxOption<V>[]): void;
  text: ComboboxLocaleText;
  id: string;
  /** Owned by the component so the hook's result stays free of refs. */
  controlRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  mode?: "client" | "server";
  searchable?: boolean;
  onSearchChange?(search: string): void;
  searchDebounce?: number;
  disabled?: boolean;
  filterFn?(option: ComboboxOption<V>, search: string): boolean;
  allowCreate?: boolean;
  onCreate?(label: string): void;
  closeOnSelect?: boolean;
  max?: number;
  onOpenChange?(open: boolean): void;
}

/**
 * State, filtering and keyboard behavior shared by Select and MultiSelect.
 * Exported so an app can build its own combobox UI on the same engine.
 */
export function useCombobox<V extends OptionValue>(params: UseComboboxParams<V>) {
  const {
    options,
    multiple,
    value,
    defaultValue,
    onValuesChange,
    id,
    mode = "client",
    searchable = true,
    onSearchChange,
    searchDebounce = 250,
    disabled = false,
    filterFn,
    allowCreate = false,
    onCreate,
    closeOnSelect = !multiple,
    max,
    onOpenChange,
    controlRef,
    searchRef,
    listRef,
  } = params;

  const [open, setOpenState] = useState(false);
  const [search, setSearchState] = useState("");
  const [requestedIndex, setRequestedIndex] = useState(-1);
  const [internalValues, setInternalValues] = useState<V[]>(defaultValue);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  /** Labels of options chosen earlier, so they survive a server-side search. */
  const [known, setKnown] = useState<ReadonlyMap<V, ComboboxOption<V>>>(() => new Map());

  const typeahead = useRef({ text: "", time: 0 });
  /** Was the list open when the pointer went down on the control? */
  const dismissedByPointer = useRef(false);

  const values = value ?? internalValues;
  const listboxId = `${id}-listbox`;
  const getOptionId = useCallback((index: number) => `${id}-option-${index}`, [id]);

  // Server mode shows what the server returned; the search only highlights.
  const entries = useMemo(() => {
    if (mode === "server") {
      const terms = splitTerms(search);
      return options.map((option) => ({ option, matches: matchRanges(option.label, terms) ?? [] }));
    }
    return filterOptions(options, search, filterFn);
  }, [options, search, mode, filterFn]);

  const items = useMemo(() => buildListItems(entries), [entries]);
  const optionsByValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);

  // `values.includes` in the hot paths below is O(values) per option, which is
  // O(options x values) across a render — noticeable in a MultiSelect holding
  // hundreds of selections over a long list.
  const selectedSet = useMemo(() => new Set(values), [values]);

  const resolveOption = useCallback(
    (v: V): ComboboxOption<V> =>
      optionsByValue.get(v) ?? known.get(v) ?? ({ value: v, label: String(v) } as ComboboxOption<V>),
    [optionsByValue, known],
  );
  const selectedOptions = useMemo(() => values.map(resolveOption), [values, resolveOption]);
  const isSelected = useCallback((v: V) => selectedSet.has(v), [selectedSet]);

  // Highlight the selected option when opening, otherwise the first one.
  const fallbackIndex = useMemo(() => {
    const selected = entries.findIndex((e) => !e.option.disabled && selectedSet.has(e.option.value));
    return selected === -1 ? firstEnabledIndex(entries) : selected;
  }, [entries, selectedSet]);

  const activeIndex =
    requestedIndex >= 0 && requestedIndex < entries.length && !entries[requestedIndex].option.disabled
      ? requestedIndex
      : open
        ? fallbackIndex
        : -1;

  const setOpen = useCallback(
    (next: boolean) => {
      if (next === open) return;
      setOpenState(next);
      setAnchor(next ? controlRef.current : null);
      setRequestedIndex(-1);
      if (!next) setSearchState("");
      onOpenChange?.(next);
    },
    [open, onOpenChange, controlRef],
  );

  const closeAndFocus = useCallback(() => {
    setOpen(false);
    controlRef.current?.focus({ preventScroll: true });
  }, [setOpen, controlRef]);

  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setRequestedIndex(-1);
  }, []);

  const commit = useCallback(
    (next: V[]) => {
      if (value === undefined) setInternalValues(next);
      onValuesChange(next, next.map(resolveOption));
    },
    [value, onValuesChange, resolveOption],
  );

  const selectOption = useCallback(
    (option: ComboboxOption<V>) => {
      if (option.disabled || disabled) return;
      setKnown((prev) => (prev.has(option.value) ? prev : new Map(prev).set(option.value, option)));
      commit(multiple ? toggleValue(values, option.value, max) : [option.value]);
      if (closeOnSelect) closeAndFocus();
      else if (!multiple) setSearchState("");
    },
    [disabled, multiple, values, max, commit, closeOnSelect, closeAndFocus],
  );

  const removeValue = useCallback(
    (v: V) => {
      if (disabled) return;
      commit(values.filter((current) => current !== v));
    },
    [disabled, values, commit],
  );

  const clear = useCallback(() => {
    if (disabled) return;
    commit([]);
  }, [disabled, commit]);

  const selectAllVisible = useCallback(() => {
    const added = entries
      .filter((entry) => !entry.option.disabled && !selectedSet.has(entry.option.value))
      .map((entry) => entry.option);
    const room = max === undefined ? added.length : Math.max(0, max - values.length);
    const next = [...values, ...added.slice(0, room).map((option) => option.value)];
    setKnown((prev) => {
      const map = new Map(prev);
      for (const option of added) map.set(option.value, option);
      return map;
    });
    commit(next);
  }, [entries, values, selectedSet, max, commit]);

  const trimmed = search.trim();
  const createLabel =
    allowCreate && trimmed && !entries.some((e) => e.option.label.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
      ? trimmed
      : null;

  const commitCreate = useCallback(() => {
    if (!createLabel) return;
    onCreate?.(createLabel);
    setSearchState("");
    if (!multiple) closeAndFocus();
  }, [createLabel, onCreate, multiple, closeAndFocus]);

  // Search requests: debounced in server mode, immediate when opening. Only
  // whether there is a handler belongs in the dependency list, not the handler
  // itself: an inline `onSearchChange` is a new function on every render of the
  // parent, and depending on it would restart the debounce each time, holding
  // the request back for as long as the parent kept rendering.
  const wantsSearch = onSearchChange !== undefined;
  const emitSearch = useEffectEvent((term: string) => onSearchChange?.(term));
  useEffect(() => {
    if (!wantsSearch || !open) return;
    const delay = mode === "server" && search ? searchDebounce : 0;
    const timer = setTimeout(() => emitSearch(search), delay);
    return () => clearTimeout(timer);
  }, [open, search, mode, searchDebounce, wantsSearch]);

  const runTypeahead = useCallback(
    (key: string) => {
      const now = Date.now();
      const buffer = now - typeahead.current.time > TYPEAHEAD_RESET_MS ? key : typeahead.current.text + key;
      typeahead.current = { text: buffer, time: now };
      const index = findByPrefix(entries, buffer, buffer.length > 1 ? activeIndex - 1 : activeIndex);
      if (index !== -1) setRequestedIndex(index);
      return index;
    },
    [entries, activeIndex],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      const { key } = event;
      const modified = event.ctrlKey || event.metaKey || event.altKey;

      if (!open) {
        if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
          event.preventDefault();
          setOpen(true);
          return;
        }
        if (multiple && key === "Backspace" && values.length > 0) {
          event.preventDefault();
          removeValue(values[values.length - 1]);
          return;
        }
        if (key.length === 1 && !modified) {
          event.preventDefault();
          if (searchable) {
            setOpen(true);
            setSearchState(key);
          } else {
            runTypeahead(key);
          }
        }
        return;
      }

      switch (key) {
        case "ArrowDown":
          event.preventDefault();
          setRequestedIndex(nextEnabledIndex(entries, activeIndex, 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setRequestedIndex(nextEnabledIndex(entries, activeIndex, -1));
          break;
        case "Home":
          event.preventDefault();
          setRequestedIndex(firstEnabledIndex(entries));
          break;
        case "End":
          event.preventDefault();
          setRequestedIndex(lastEnabledIndex(entries));
          break;
        case "PageDown":
          event.preventDefault();
          setRequestedIndex(firstEnabledIndex(entries, Math.min(entries.length - 1, activeIndex + PAGE_STEP)));
          break;
        case "PageUp":
          event.preventDefault();
          setRequestedIndex(firstEnabledIndex(entries, Math.max(0, activeIndex - PAGE_STEP)));
          break;
        case "Enter": {
          event.preventDefault();
          const entry = entries[activeIndex];
          if (entry) selectOption(entry.option);
          else commitCreate();
          break;
        }
        case "Escape":
          event.preventDefault();
          closeAndFocus();
          break;
        case "Tab":
          setOpen(false);
          break;
        case "Backspace":
          if (multiple && search === "" && values.length > 0) {
            event.preventDefault();
            removeValue(values[values.length - 1]);
          }
          break;
        default:
          if (!searchable && key.length === 1 && !modified) {
            event.preventDefault();
            runTypeahead(key);
          }
      }
    },
    [
      disabled,
      open,
      multiple,
      values,
      searchable,
      entries,
      activeIndex,
      search,
      setOpen,
      removeValue,
      selectOption,
      commitCreate,
      closeAndFocus,
      runTypeahead,
    ],
  );

  /** The pointer press that light-dismissed an open list must not reopen it. */
  const onControlPointerDown = useCallback(() => {
    dismissedByPointer.current = open;
  }, [open]);

  const onControlClick = useCallback(() => {
    if (disabled) return;
    if (dismissedByPointer.current) {
      dismissedByPointer.current = false;
      return;
    }
    setOpen(!open);
  }, [disabled, open, setOpen]);

  /** Light dismiss and Escape come from the native popover. */
  const onPopoverClose = useCallback(() => {
    if (!open) return;
    const active = document.activeElement;
    const insideList = active === searchRef.current || listRef.current?.contains(active) === true;
    setOpen(false);
    if (insideList || active === document.body || active === null) {
      controlRef.current?.focus({ preventScroll: true });
    }
  }, [open, setOpen, controlRef, searchRef, listRef]);

  const handle = useMemo<ComboboxHandle<V>>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!open),
      focus: () => controlRef.current?.focus(),
      clear: () => commit([]),
      getValue: () => [...values],
      getSelectedOptions: () => selectedOptions,
    }),
    [setOpen, open, commit, values, selectedOptions, controlRef],
  );

  return {
    open,
    setOpen,
    anchor,
    search,
    setSearch,
    entries,
    items,
    activeIndex,
    setActiveIndex: setRequestedIndex,
    values,
    selectedOptions,
    isSelected,
    selectOption,
    removeValue,
    clear,
    selectAllVisible,
    createLabel,
    commitCreate,
    listboxId,
    getOptionId,
    onKeyDown,
    onControlClick,
    onControlPointerDown,
    onPopoverClose,
    handle,
  };
}
