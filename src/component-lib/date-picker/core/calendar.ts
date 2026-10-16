import type {
  CalendarDay,
  CalendarMonth,
  CalendarWeek,
  DateInput,
  DateLimits,
  DateRange,
} from "./types";

/**
 * Every date in this package is a local-time Date at midnight. Keeping one
 * convention means day comparisons never depend on hours, time zones or DST,
 * and `toISODate` never shifts a day the way `toISOString` does.
 */
export function startOfDay(date: Date): Date {
  const copy = new Date(date.getTime());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Strict `yyyy-mm-dd` in local time; null for anything else, including `2026-02-31`. */
export function parseISODate(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  const valid =
    date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  return valid ? date : null;
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Normalizes a prop value. ISO strings are read as local dates, not UTC. */
export function toDate(value: DateInput | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const iso = parseISODate(value);
    if (iso) return iso;
  }
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

/** Negative when `a` is the earlier day, 0 on the same day. Ignores the time. */
export function compareDay(a: Date, b: Date): number {
  return (
    a.getFullYear() - b.getFullYear() || a.getMonth() - b.getMonth() || a.getDate() - b.getDate()
  );
}

export const isSameDay = (a: Date | null | undefined, b: Date | null | undefined): boolean =>
  a != null && b != null && compareDay(a, b) === 0;

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Keeps the day of the month where the target month is long enough (Jan 31 + 1 → Feb 28). */
export function addMonths(date: Date, amount: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + amount;
  const day = Math.min(date.getDate(), daysInMonth(year, month));
  const copy = new Date(year, month, day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export const startOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), 1);

export const endOfMonth = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

export function clampDate(date: Date, min?: Date | null, max?: Date | null): Date {
  if (min && compareDay(date, min) < 0) return startOfDay(min);
  if (max && compareDay(date, max) > 0) return startOfDay(max);
  return date;
}

export function isDayDisabled(date: Date, limits: DateLimits = {}): boolean {
  if (limits.min && compareDay(date, limits.min) < 0) return true;
  if (limits.max && compareDay(date, limits.max) > 0) return true;
  return limits.isDateDisabled?.(date) === true;
}

interface WeekInfoLocale {
  getWeekInfo?(): { firstDay: number };
  weekInfo?: { firstDay: number };
}

/**
 * First day of the week for a locale, 0 = Sunday. Browsers expose this through
 * `Intl.Locale`; where they don't, ISO Monday is used unless `explicit` is given.
 */
export function resolveWeekStart(locale?: string, explicit?: number): number {
  if (explicit !== undefined) return ((explicit % 7) + 7) % 7;
  try {
    const tag = locale ?? new Intl.DateTimeFormat().resolvedOptions().locale;
    const info = new Intl.Locale(tag) as unknown as WeekInfoLocale;
    const firstDay = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (typeof firstDay === "number") return firstDay % 7;
  } catch {
    // Locale data is unavailable in this runtime; fall through to the ISO default.
  }
  return 1;
}

/** ISO 8601 week number: week 1 is the one holding the first Thursday of the year. */
export function getISOWeek(date: Date): number {
  const target = startOfDay(date);
  target.setDate(target.getDate() - ((target.getDay() + 6) % 7) + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
  const week = 7 * 24 * 60 * 60 * 1000;
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / week);
}

export interface BuildMonthOptions extends DateLimits {
  /** 0 = Sunday. Default Monday. */
  weekStartsOn?: number;
  /** Always six week rows, so the popover height never jumps. Default true. */
  fixedWeeks?: boolean;
  /**
   * Injected so a test can pin "today". `null` marks no day at all, which is
   * what a server render and the hydrating render pass (see core/today.ts).
   */
  today?: Date | null;
}

export function buildMonth(
  year: number,
  month: number,
  options: BuildMonthOptions = {},
): CalendarMonth {
  const { weekStartsOn = 1, fixedWeeks = true, today = startOfDay(new Date()) } = options;
  const first = new Date(year, month, 1);
  const lead = (first.getDay() - weekStartsOn + 7) % 7;
  const rows = fixedWeeks ? 6 : Math.ceil((lead + daysInMonth(year, month)) / 7);

  const weeks: CalendarWeek[] = [];
  let cursor = addDays(first, -lead);
  for (let row = 0; row < rows; row++) {
    const days: CalendarDay[] = [];
    for (let column = 0; column < 7; column++) {
      const weekday = cursor.getDay();
      days.push({
        date: cursor,
        day: cursor.getDate(),
        key: toISODate(cursor),
        outside: cursor.getMonth() !== month || cursor.getFullYear() !== year,
        today: today !== null && compareDay(cursor, today) === 0,
        weekend: weekday === 0 || weekday === 6,
        disabled: isDayDisabled(cursor, options),
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push({ weekNumber: getISOWeek(days[0].date), days });
  }
  return { year, month, weeks };
}

/** `count` consecutive months starting at the month of `start`. */
export function buildMonths(
  start: Date,
  count: number,
  options: BuildMonthOptions = {},
): CalendarMonth[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const month = addMonths(startOfMonth(start), index);
    return buildMonth(month.getFullYear(), month.getMonth(), options);
  });
}

/** Puts a backwards range the right way round, so dragging in either direction works. */
export function normalizeRange(range: DateRange): DateRange {
  const { start, end } = range;
  if (start && end && compareDay(start, end) > 0) return { start: end, end: start };
  return range;
}

export function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  return compareDay(date, start) >= 0 && compareDay(date, end) <= 0;
}

export interface MoveOptions {
  weekStartsOn?: number;
  /** Swaps the arrow keys, so "next day" stays to the reading-forward side. */
  rtl?: boolean;
  shiftKey?: boolean;
}

/** Where a key press moves the focused day, or null when the key isn't ours. */
export function moveByKey(date: Date, key: string, options: MoveOptions = {}): Date | null {
  const { weekStartsOn = 1, rtl = false, shiftKey = false } = options;
  const offsetInWeek = (date.getDay() - weekStartsOn + 7) % 7;
  switch (key) {
    case rtl ? "ArrowRight" : "ArrowLeft":
      return addDays(date, -1);
    case rtl ? "ArrowLeft" : "ArrowRight":
      return addDays(date, 1);
    case "ArrowUp":
      return addDays(date, -7);
    case "ArrowDown":
      return addDays(date, 7);
    case "Home":
      return addDays(date, -offsetInWeek);
    case "End":
      return addDays(date, 6 - offsetInWeek);
    case "PageUp":
      return addMonths(date, shiftKey ? -12 : -1);
    case "PageDown":
      return addMonths(date, shiftKey ? 12 : 1);
    default:
      return null;
  }
}

/** Arrow-key movement inside the month and year panels. Returns null for other keys. */
export function moveInGrid(
  index: number,
  key: string,
  columns: number,
  count: number,
  rtl = false,
): number | null {
  const clamp = (next: number) => Math.max(0, Math.min(count - 1, next));
  switch (key) {
    case rtl ? "ArrowRight" : "ArrowLeft":
      return clamp(index - 1);
    case rtl ? "ArrowLeft" : "ArrowRight":
      return clamp(index + 1);
    case "ArrowUp":
      return clamp(index - columns);
    case "ArrowDown":
      return clamp(index + columns);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** The page of years holding `year`, so the year panel pages in steady blocks. */
export function yearPage(year: number, size = 12): number[] {
  const start = Math.floor(year / size) * size;
  return Array.from({ length: size }, (_, index) => start + index);
}
