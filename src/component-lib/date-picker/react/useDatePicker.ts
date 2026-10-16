"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  addMonths,
  buildMonths,
  clampDate,
  compareDay,
  daysInMonth,
  isDayDisabled,
  isInRange,
  isSameDay,
  moveByKey,
  normalizeRange,
  resolveWeekStart,
  startOfDay,
  startOfMonth,
  toISODate,
  yearPage,
} from "../core/calendar";
import { getServerToday, getToday, subscribeToToday } from "../core/today";
import {
  DEFAULT_DATE_FORMAT,
  formatDate,
  formatMonthYear,
  monthNames,
  parseDate,
  weekdayNames,
} from "../core/format";
import type {
  CalendarMonth,
  CalendarView,
  DatePickerLocaleText,
  DateRange,
} from "../core/types";
import type { DayState } from "./Calendar";
import type { DateFormat } from "./props";

/** Which of the two fields a range picker is currently editing. */
export type RangeField = "start" | "end";

export function formatWith(
  date: Date,
  format: DateFormat | undefined,
  locale: string | undefined,
): string {
  if (typeof format === "function") return format(date, locale);
  return formatDate(date, locale, format ?? DEFAULT_DATE_FORMAT);
}

export interface UseDatePickerParams {
  /** Two dates instead of one. */
  range: boolean;
  /** Controlled selection; `undefined` keeps it internal. */
  value?: DateRange;
  defaultValue: DateRange;
  /** `complete` is false while a range is still half-picked. */
  onSelectionChange(next: DateRange, complete: boolean): void;
  min: Date | null;
  max: Date | null;
  isDateDisabled?(date: Date): boolean;
  locale?: string;
  weekStartsOn?: number;
  numberOfMonths: number;
  fixedWeeks: boolean;
  disabled: boolean;
  readOnly: boolean;
  closeOnSelect: boolean;
  format?: DateFormat;
  text: DatePickerLocaleText;
  controlRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenChange?(open: boolean): void;
}

/**
 * Everything both pickers do: selection, the visible months, typed input,
 * keyboard movement and the popover's open state. Exported so an app can build
 * its own calendar UI on the same engine.
 */
export function useDatePicker(params: UseDatePickerParams) {
  const {
    range,
    value,
    defaultValue,
    onSelectionChange,
    min,
    max,
    isDateDisabled,
    locale,
    weekStartsOn,
    numberOfMonths,
    fixedWeeks,
    disabled,
    readOnly,
    closeOnSelect,
    format,
    text,
    controlRef,
    triggerRef,
    onOpenChange,
  } = params;

  /**
   * Null on the server and through hydration, a real day everywhere else, and
   * it changes by itself at midnight. `core/today.ts` explains why all three
   * matter. Where a concrete day is needed to decide which month to show,
   * `startOfDay(new Date())` stands in: that only ever runs in the browser, in
   * response to something the user did, so it cannot reach the markup.
   */
  const today = useSyncExternalStore(subscribeToToday, getToday, getServerToday);
  const todayOrNow = useCallback(() => today ?? startOfDay(new Date()), [today]);
  const limits = useMemo(
    () => ({ min, max, isDateDisabled }),
    [min, max, isDateDisabled],
  );
  const weekStart = useMemo(
    () => resolveWeekStart(locale, weekStartsOn),
    [locale, weekStartsOn],
  );

  const [open, setOpenState] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [view, setView] = useState<CalendarView>("days");
  const [internal, setInternal] = useState<DateRange>(defaultValue);
  const [focusedDate, setFocusedDate] = useState(() =>
    clampDate(defaultValue.start ?? todayOrNow(), min, max),
  );
  const [viewDate, setViewDate] = useState(() => startOfMonth(focusedDate));
  const [gridFocus, setGridFocus] = useState(false);
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [preview, setPreview] = useState<Date | null>(null);
  const [yearCursor, setYearCursor] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<RangeField, string | null>>({
    start: null,
    end: null,
  });
  const [inputError, setInputError] = useState<string | null>(null);

  /** The press that light-dismissed an open popover must not reopen it. */
  const dismissedByPointer = useRef(false);

  const selection = value ?? internal;
  const editable = !disabled && !readOnly;

  const months: CalendarMonth[] = useMemo(
    () =>
      buildMonths(viewDate, numberOfMonths, {
        weekStartsOn: weekStart,
        fixedWeeks,
        today,
        ...limits,
      }),
    [viewDate, numberOfMonths, weekStart, fixedWeeks, today, limits],
  );

  const weekdays = useMemo(() => weekdayNames(locale, weekStart), [locale, weekStart]);
  const monthLabels = useMemo(() => monthNames(locale, "long"), [locale]);
  const years = useMemo(
    () => yearPage(yearCursor ?? focusedDate.getFullYear()),
    [yearCursor, focusedDate],
  );

  /** Keeps the focused day on screen after keyboard movement. */
  const ensureVisible = useCallback(
    (date: Date) => {
      setViewDate((current) => {
        const first = startOfMonth(current);
        const last = addMonths(first, numberOfMonths - 1);
        if (compareDay(date, first) < 0) return startOfMonth(date);
        if (compareDay(date, addMonths(last, 1)) >= 0) {
          return startOfMonth(addMonths(date, -(numberOfMonths - 1)));
        }
        return current;
      });
    },
    [numberOfMonths],
  );

  const commit = useCallback(
    (next: DateRange, complete: boolean) => {
      if (value === undefined) setInternal(next);
      onSelectionChange(next, complete);
    },
    [value, onSelectionChange],
  );

  const setOpen = useCallback(
    (next: boolean, focusTarget: "grid" | "field" = "grid") => {
      if (next === open) return;
      setOpenState(next);
      setAnchor(next ? controlRef.current : null);
      setGridFocus(next && focusTarget === "grid");
      if (next) {
        const base = clampDate(selection.start ?? todayOrNow(), min, max);
        setView("days");
        setFocusedDate(base);
        setViewDate(startOfMonth(base));
        setPendingStart(null);
        setPreview(null);
        setYearCursor(null);
      }
      onOpenChange?.(next);
    },
    [open, controlRef, selection.start, todayOrNow, min, max, onOpenChange],
  );

  const closeAndFocusTrigger = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }, [setOpen, triggerRef]);

  const selectDate = useCallback(
    (date: Date) => {
      if (!editable || isDayDisabled(date, limits)) return;
      setFocusedDate(date);
      setInputError(null);
      setDrafts({ start: null, end: null });

      if (!range) {
        commit({ start: date, end: null }, true);
        if (closeOnSelect) closeAndFocusTrigger();
        return;
      }

      const startingOver = pendingStart === null;
      if (startingOver) {
        setPendingStart(date);
        setPreview(date);
        commit({ start: date, end: null }, false);
        return;
      }

      const next = normalizeRange({ start: pendingStart, end: date });
      setPendingStart(null);
      setPreview(null);
      commit(next, true);
      if (closeOnSelect) closeAndFocusTrigger();
    },
    [editable, limits, range, pendingStart, commit, closeOnSelect, closeAndFocusTrigger],
  );

  const clear = useCallback(() => {
    if (!editable) return;
    setPendingStart(null);
    setPreview(null);
    setDrafts({ start: null, end: null });
    setInputError(null);
    commit({ start: null, end: null }, true);
  }, [editable, commit]);

  /** Selects a whole range at once, for presets and programmatic changes. */
  const applyRange = useCallback(
    (next: DateRange, complete = true) => {
      if (!editable) return;
      const normalized = next.start && next.end ? normalizeRange(next) : next;
      setPendingStart(null);
      setPreview(null);
      setDrafts({ start: null, end: null });
      setInputError(null);
      if (normalized.start) {
        setFocusedDate(normalized.start);
        setViewDate(startOfMonth(normalized.start));
      }
      commit(normalized, complete);
    },
    [editable, commit],
  );

  /** Hovering only matters while a range is half-picked. */
  const onPreview = useCallback(
    (date: Date | null) => {
      if (range) setPreview(date);
    },
    [range],
  );

  const goToToday = useCallback(() => {
    const target = clampDate(todayOrNow(), min, max);
    setFocusedDate(target);
    setViewDate(startOfMonth(target));
    setGridFocus(true);
  }, [todayOrNow, min, max]);

  const goToMonth = useCallback(
    (delta: number) => setViewDate((current) => addMonths(current, delta)),
    [],
  );

  const goToYear = useCallback(
    (delta: number) => setViewDate((current) => addMonths(current, delta * 12)),
    [],
  );

  const canGoPrev = useMemo(() => {
    if (!min) return true;
    return compareDay(startOfMonth(viewDate), startOfMonth(min)) > 0;
  }, [min, viewDate]);

  const canGoNext = useMemo(() => {
    if (!max) return true;
    const lastVisible = addMonths(startOfMonth(viewDate), numberOfMonths - 1);
    return compareDay(lastVisible, startOfMonth(max)) < 0;
  }, [max, viewDate, numberOfMonths]);

  const shiftYearPage = useCallback(
    (delta: number) => setYearCursor((years[0] ?? focusedDate.getFullYear()) + delta * 12),
    [years, focusedDate],
  );

  const selectMonth = useCallback(
    (month: number) => {
      const year = viewDate.getFullYear();
      setViewDate(new Date(year, month, 1));
      setFocusedDate((current) =>
        clampDate(
          new Date(year, month, Math.min(current.getDate(), daysInMonth(year, month))),
          min,
          max,
        ),
      );
      setView("days");
      setGridFocus(true);
    },
    [viewDate, min, max],
  );

  const selectYear = useCallback(
    (year: number) => {
      setViewDate((current) => new Date(year, current.getMonth(), 1));
      setYearCursor(null);
      setView("months");
    },
    [],
  );

  const isMonthDisabled = useCallback(
    (month: number) => {
      const year = viewDate.getFullYear();
      if (min && (year < min.getFullYear() || (year === min.getFullYear() && month < min.getMonth())))
        return true;
      if (max && (year > max.getFullYear() || (year === max.getFullYear() && month > max.getMonth())))
        return true;
      return false;
    },
    [viewDate, min, max],
  );

  const isYearDisabled = useCallback(
    (year: number) => {
      if (min && year < min.getFullYear()) return true;
      if (max && year > max.getFullYear()) return true;
      return false;
    },
    [min, max],
  );

  const onGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const next = moveByKey(focusedDate, event.key, {
        weekStartsOn: weekStart,
        rtl,
        shiftKey: event.shiftKey,
      });
      if (!next) return;
      event.preventDefault();
      const target = clampDate(next, min, max);
      setGridFocus(true);
      setFocusedDate(target);
      if (range && pendingStart) setPreview(target);
      ensureVisible(target);
    },
    [focusedDate, weekStart, min, max, range, pendingStart, ensureVisible],
  );

  /** Range styling, including the live preview while the second date is being picked. */
  const getDayState = useCallback(
    (date: Date): DayState => {
      const previewRange =
        range && pendingStart && preview
          ? normalizeRange({ start: pendingStart, end: preview })
          : null;
      const start = previewRange?.start ?? selection.start;
      const end = previewRange?.end ?? selection.end;
      return {
        selected: isSameDay(date, start) || isSameDay(date, end),
        rangeStart: range && isSameDay(date, start) && end !== null,
        rangeEnd: range && isSameDay(date, end) && start !== null,
        inRange: range && isInRange(date, start, end),
      };
    },
    [range, pendingStart, preview, selection],
  );

  const formatValue = useCallback(
    (date: Date | null) => (date ? formatWith(date, format, locale) : ""),
    [format, locale],
  );

  const inputValue = useCallback(
    (field: RangeField) => drafts[field] ?? formatValue(selection[field]),
    [drafts, formatValue, selection],
  );

  const onInputChange = useCallback(
    (field: RangeField, raw: string) => {
      if (!editable) return;
      setDrafts((current) => ({ ...current, [field]: raw }));
      setInputError(null);

      const parsed = parseDate(raw, locale, focusedDate);
      if (!parsed || isDayDisabled(parsed, limits)) return;

      setFocusedDate(parsed);
      ensureVisible(parsed);
      if (!range) {
        commit({ start: parsed, end: null }, true);
        return;
      }
      const next =
        field === "start"
          ? { start: parsed, end: selection.end }
          : { start: selection.start, end: parsed };
      commit(next.start && next.end ? normalizeRange(next) : next, Boolean(next.start && next.end));
    },
    [editable, locale, focusedDate, limits, ensureVisible, range, commit, selection],
  );

  /** Typing is committed as it parses; the blur decides what to do with leftovers. */
  const onInputBlur = useCallback(
    (field: RangeField) => {
      const raw = drafts[field];
      if (raw === null) return;
      setDrafts((current) => ({ ...current, [field]: null }));

      const trimmed = raw.trim();
      if (!trimmed) {
        setInputError(null);
        commit(
          range
            ? { start: field === "start" ? null : selection.start, end: field === "end" ? null : selection.end }
            : { start: null, end: null },
          true,
        );
        return;
      }

      const parsed = parseDate(trimmed, locale, focusedDate);
      if (!parsed) {
        setInputError(text.invalidDate);
        return;
      }
      if (isDayDisabled(parsed, limits)) {
        setInputError(text.outOfRange);
        return;
      }
      setInputError(null);
    },
    [drafts, commit, range, selection, locale, focusedDate, limits, text],
  );

  const onTriggerPointerDown = useCallback(() => {
    dismissedByPointer.current = open;
  }, [open]);

  const onTriggerClick = useCallback(() => {
    if (disabled) return;
    if (dismissedByPointer.current) {
      dismissedByPointer.current = false;
      return;
    }
    setOpen(!open);
  }, [disabled, open, setOpen]);

  /** Light dismiss and Escape arrive through the native popover. */
  const onPopoverClose = useCallback(() => {
    if (!open) return;
    const active = document.activeElement;
    const insidePopover = active?.closest("[popover]") != null;
    setOpen(false);
    if (insidePopover || active === document.body || active === null) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open, setOpen, triggerRef]);

  const title = useMemo(() => {
    const first = months[0];
    const last = months[months.length - 1];
    const firstLabel = formatMonthYear(first.year, first.month, locale);
    if (months.length === 1) return firstLabel;
    return `${firstLabel} – ${formatMonthYear(last.year, last.month, locale)}`;
  }, [months, locale]);

  const monthLabel = useCallback(
    (month: CalendarMonth) => formatMonthYear(month.year, month.month, locale),
    [locale],
  );

  return {
    open,
    setOpen,
    anchor,
    view,
    setView,
    months,
    monthLabels,
    monthLabel,
    weekdays,
    years,
    title,
    focusedDate,
    focusedKey: toISODate(focusedDate),
    gridFocus,
    setGridFocus,
    selection,
    pendingStart,
    preview,
    onPreview,
    selectDate,
    applyRange,
    clear,
    goToToday,
    goToMonth,
    goToYear,
    canGoPrev,
    canGoNext,
    shiftYearPage,
    selectMonth,
    selectYear,
    isMonthDisabled,
    isYearDisabled,
    onGridKeyDown,
    getDayState,
    formatValue,
    inputValue,
    onInputChange,
    onInputBlur,
    inputError,
    onTriggerPointerDown,
    onTriggerClick,
    onPopoverClose,
    closeAndFocusTrigger,
    weekStart,
  };
}

/** Everything `useDatePicker` returns; the UI pieces take it as one prop. */
export type DatePickerEngine = ReturnType<typeof useDatePicker>;
