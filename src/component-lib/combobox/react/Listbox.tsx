"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  type UIEvent,
} from "react";
import type {
  ComboboxLocaleText,
  ComboboxOption,
  ComboboxSize,
  ListItem,
  MatchRange,
  OptionValue,
} from "../core/types";
import { getVisibleRange, measureItems, scrollToItem } from "../core/virtual";
import { CheckIcon, PlusIcon, SearchIcon, SpinnerIcon } from "./icons";
import { cx, type ComboboxSlot, type OptionState } from "./props";

const OPTION_HEIGHT: Record<ComboboxSize, number> = { sm: 30, md: 34, lg: 40 };
const GROUP_HEIGHT = 26;
const DESCRIPTION_EXTRA = 16;
const VIRTUALIZE_FROM = 80;

interface ListboxProps<V extends OptionValue> {
  listboxId: string;
  labelledBy: string;
  items: ListItem<V>[];
  optionCount: number;
  activeIndex: number;
  multiple: boolean;
  size: ComboboxSize;
  maxHeight: number;
  virtualize: boolean | number;
  loading: boolean;
  hasMore?: boolean;
  searchable: boolean;
  search: string;
  searchRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  text: ComboboxLocaleText;
  classNames: Partial<Record<ComboboxSlot, string>> | undefined;
  emptyMessage: ReactNode;
  createLabel: string | null;
  footer?: ReactNode;
  getOptionId(index: number): string;
  isSelected(value: V): boolean;
  onSelect(option: ComboboxOption<V>): void;
  onActiveIndexChange(index: number): void;
  onSearchChange(search: string): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
  onLoadMore?(): void;
  onCreate(): void;
  renderOption?(option: ComboboxOption<V>, state: OptionState): ReactNode;
}

function Highlight({ text, matches }: { text: string; matches: MatchRange[] }) {
  if (matches.length === 0) return text;
  const parts: ReactNode[] = [];
  let cursor = 0;
  matches.forEach(([start, end], i) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark className="cb-mark" key={i}>
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function Listbox<V extends OptionValue>({
  listboxId,
  labelledBy,
  items,
  optionCount,
  activeIndex,
  multiple,
  size,
  maxHeight,
  virtualize,
  loading,
  hasMore,
  searchable,
  search,
  searchRef,
  listRef,
  text,
  classNames,
  emptyMessage,
  createLabel,
  footer,
  getOptionId,
  isSelected,
  onSelect,
  onActiveIndexChange,
  onSearchChange,
  onKeyDown,
  onLoadMore,
  onCreate,
  renderOption,
}: ListboxProps<V>) {
  const [scrollTop, setScrollTop] = useState(0);

  const hasDescription = useMemo(
    () => items.some((item) => item.kind === "option" && item.entry.option.description),
    [items],
  );
  const sizes = useMemo(
    () => ({
      option: OPTION_HEIGHT[size] + (hasDescription ? DESCRIPTION_EXTRA : 0),
      group: GROUP_HEIGHT,
    }),
    [size, hasDescription],
  );

  const isVirtual =
    typeof virtualize === "number" ? optionCount > virtualize : virtualize && optionCount > VIRTUALIZE_FROM;
  const metrics = useMemo(() => measureItems(items, sizes), [items, sizes]);
  const listHeight = Math.min(maxHeight, metrics.total + 8);

  // Item index of each option, so the active option can be scrolled into view.
  const itemIndexByOption = useMemo(() => {
    const map = new Array<number>(optionCount);
    items.forEach((item, index) => {
      if (item.kind === "option") map[item.index] = index;
    });
    return map;
  }, [items, optionCount]);

  useLayoutEffect(() => {
    const el = listRef.current;
    const itemIndex = itemIndexByOption[activeIndex];
    if (!el || activeIndex < 0 || itemIndex === undefined) return;
    const next = scrollToItem(metrics, itemIndex, el.scrollTop, el.clientHeight);
    if (next !== null) {
      el.scrollTop = next;
      setScrollTop(next);
    }
  }, [activeIndex, itemIndexByOption, metrics, listRef]);

  // The next page is asked for at most once per list length. `loading` is not
  // enough on its own: it belongs to the caller and only turns on a render or
  // more later, while scroll events fire many times a second, so a single flick
  // at the end of the list would otherwise send a burst of identical requests.
  const requestedAt = useRef(-1);
  const loadMore = () => {
    if (!hasMore || loading || !onLoadMore || requestedAt.current === items.length) return;
    requestedAt.current = items.length;
    onLoadMore();
  };

  // If the list is already scrolled to the end when new options arrive, no
  // scroll event follows, so ask from here instead.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !hasMore || loading || !onLoadMore || requestedAt.current === items.length) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      requestedAt.current = items.length;
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore, items.length, listRef]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    setScrollTop(el.scrollTop);
    if (el.scrollTop + el.clientHeight >= metrics.total - 80) loadMore();
  };

  const range = isVirtual
    ? getVisibleRange(metrics, scrollTop, listHeight)
    : { start: 0, end: items.length };

  const renderItem = (item: ListItem<V>, itemIndex: number): ReactNode => {
    const style: CSSProperties | undefined = isVirtual
      ? { top: metrics.offsets[itemIndex], height: item.kind === "group" ? sizes.group : sizes.option }
      : undefined;

    if (item.kind === "group") {
      return (
        <div key={`group-${item.label}-${itemIndex}`} className="cb-group" role="presentation" style={style}>
          {item.label}
        </div>
      );
    }

    const { option, matches } = item.entry;
    const selected = isSelected(option.value);
    const active = activeIndex === item.index;
    return (
      <div
        key={String(option.value)}
        id={getOptionId(item.index)}
        role="option"
        aria-selected={selected}
        aria-disabled={option.disabled || undefined}
        className={cx("cb-item", classNames?.option)}
        style={style}
        data-active={active || undefined}
        data-selected={selected || undefined}
        data-disabled={option.disabled || undefined}
        // Keep focus in the search box so typing continues to work.
        onPointerDown={(event) => event.preventDefault()}
        onPointerMove={() => !option.disabled && !active && onActiveIndexChange(item.index)}
        onClick={() => !option.disabled && onSelect(option)}
      >
        <CheckIcon className="cb-item-check" />
        {option.icon && <span className="cb-item-icon">{option.icon}</span>}
        {renderOption ? (
          renderOption(option, { selected, active })
        ) : (
          <span className="cb-item-body">
            <span className="cb-item-label">
              <Highlight text={option.label} matches={matches} />
            </span>
            {option.description && <span className="cb-item-description">{option.description}</span>}
          </span>
        )}
      </div>
    );
  };

  const empty = items.length === 0 && !createLabel;

  return (
    <>
      {searchable && (
        <div className={cx("cb-search", classNames?.search)}>
          <SearchIcon />
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? getOptionId(activeIndex) : undefined}
            aria-label={text.searchPlaceholder}
            autoComplete="off"
            spellCheck={false}
            data-autofocus=""
            placeholder={text.searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {loading && <SpinnerIcon aria-label={text.loading} />}
        </div>
      )}

      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-labelledby={labelledBy}
        aria-multiselectable={multiple || undefined}
        className={cx("cb-list", classNames?.list)}
        style={{ height: empty ? undefined : listHeight }}
        data-virtual={isVirtual || undefined}
        tabIndex={searchable ? -1 : 0}
        onScroll={onScroll}
        onKeyDown={searchable ? undefined : onKeyDown}
      >
        {isVirtual && <div style={{ height: metrics.total }} aria-hidden="true" />}
        {items.slice(range.start, range.end).map((item, i) => renderItem(item, range.start + i))}

        {createLabel && (
          <div
            role="option"
            aria-selected={false}
            className="cb-item cb-create"
            data-active={activeIndex === -1 || undefined}
            onPointerDown={(event) => event.preventDefault()}
            onClick={onCreate}
          >
            <PlusIcon className="cb-item-check" style={{ opacity: 1 }} />
            <span className="cb-item-body">
              <span className="cb-item-label">{text.createOption(createLabel)}</span>
            </span>
          </div>
        )}

        {empty && !loading && <div className="cb-empty">{emptyMessage ?? text.noResults}</div>}
        {loading && items.length === 0 && (
          <div className="cb-status">
            <SpinnerIcon />
            {text.loading}
          </div>
        )}
        {hasMore && items.length > 0 && (
          <div className="cb-status">
            <button type="button" className="cb-link-button" disabled={loading} onClick={() => onLoadMore?.()}>
              {loading ? text.loading : text.loadMore}
            </button>
          </div>
        )}
      </div>

      {footer && <div className={cx("cb-footer", classNames?.footer)}>{footer}</div>}
    </>
  );
}
