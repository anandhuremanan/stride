import { parseISODate } from "./calendar";

/** `Intl.DateTimeFormat` is expensive to build, and these are reused every render. */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string | undefined, options: Intl.DateTimeFormatOptions) {
  const key = `${locale ?? ""}|${JSON.stringify(options)}`;
  let found = formatters.get(key);
  if (!found) {
    found = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, found);
  }
  return found;
}

export const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};
export const DEFAULT_INPUT_PLACEHOLDER = "dd/mm/yyyy";

export function formatDate(
  date: Date,
  locale?: string,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_FORMAT,
): string {
  return formatter(locale, options).format(date);
}

export function formatMonthYear(year: number, month: number, locale?: string): string {
  return formatter(locale, { year: "numeric", month: "long" }).format(new Date(year, month, 1));
}

export function monthNames(locale?: string, width: "long" | "short" = "long"): string[] {
  const format = formatter(locale, { month: width });
  return Array.from({ length: 12 }, (_, month) => format.format(new Date(2024, month, 1)));
}

export interface WeekdayName {
  short: string;
  long: string;
}

/** The seven weekday names, ordered from `weekStartsOn`. */
export function weekdayNames(locale?: string, weekStartsOn = 1): WeekdayName[] {
  const short = formatter(locale, { weekday: "short" });
  const long = formatter(locale, { weekday: "long" });
  // 2024-01-07 was a Sunday, so index 0 lines up with `Date.prototype.getDay`.
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(2024, 0, 7 + ((weekStartsOn + offset) % 7));
    return { short: short.format(date), long: long.format(date) };
  });
}

export type DateField = "day" | "month" | "year";

/** The order a locale writes a numeric date in, used for parsing and the placeholder. */
export function fieldOrder(locale?: string): DateField[] {
  const parts = formatter(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2024, 10, 22));
  const order = parts
    .map((part) => part.type)
    .filter((type): type is DateField => type === "day" || type === "month" || type === "year");
  return order.length === 3 ? order : ["day", "month", "year"];
}

function separator(locale?: string): string {
  const parts = formatter(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(2024, 10, 22));
  const literal = parts.find((part) => part.type === "literal" && part.value.trim());
  return literal ? literal.value.trim() : "/";
}

/** A hint in the locale's own order, e.g. `dd/mm/yyyy` or `mm/dd/yyyy`. */
export function inputPlaceholder(locale?: string): string {
  if (!locale) return DEFAULT_INPUT_PLACEHOLDER;
  const hint: Record<DateField, string> = { day: "dd", month: "mm", year: "yyyy" };
  return fieldOrder(locale)
    .map((field) => hint[field])
    .join(separator(locale));
}

/** Two-digit years follow the usual pivot: 00-68 is 2000s, 69-99 is 1900s. */
function expandYear(year: number): number {
  if (year >= 100) return year;
  return year <= 68 ? 2000 + year : 1900 + year;
}

function build(year: number, month: number, day: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  const valid =
    date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  return valid ? date : null;
}

/** Matches a written month name, long or short, by either being a prefix of the other. */
function monthFromWords(words: string, locale?: string): number | null {
  const needle = words.toLocaleLowerCase();
  const names = [...monthNames(locale, "long"), ...monthNames(locale, "short")];
  const index = names.findIndex((name) => {
    const candidate = name.toLocaleLowerCase().replace(/\.$/, "");
    return candidate.startsWith(needle) || needle.startsWith(candidate);
  });
  return index === -1 ? null : index % 12;
}

/**
 * Reads what someone typed into the field. ISO is accepted everywhere; anything
 * else is read in the locale's field order, so `03/04/2026` is 3 April in
 * en-GB and 4 March in en-US. Month names work too (`12 Mar 2026`).
 * Missing parts fall back to `reference`. Returns null when it isn't a date.
 */
export function parseDate(
  text: string,
  locale?: string,
  reference: Date = new Date(),
): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const iso = parseISODate(trimmed);
  if (iso) return iso;

  let month: number | null = null;
  const words = trimmed.match(/\p{L}+/gu);
  if (words) {
    month = monthFromWords(words.join(" "), locale);
    if (month === null) return null;
  }

  const numbers = (trimmed.match(/\d+/g) ?? []).map(Number);
  if (numbers.length === 0) return null;

  const order = fieldOrder(locale);

  if (month !== null) {
    // A month name was given, so the numbers are the day and maybe the year.
    if (numbers.length === 1) {
      return build(reference.getFullYear(), month, numbers[0]);
    }
    const yearFirst = numbers[0] >= 32;
    const year = expandYear(yearFirst ? numbers[0] : numbers[1]);
    const day = yearFirst ? numbers[1] : numbers[0];
    return build(year, month, day);
  }

  if (numbers.length >= 3) {
    const fields = numbers[0] >= 1000 ? (["year", "month", "day"] as DateField[]) : order;
    const value = (field: DateField) => numbers[fields.indexOf(field)];
    return build(expandYear(value("year")), value("month") - 1, value("day"));
  }

  if (numbers.length === 2) {
    const dayFirst = order.indexOf("day") < order.indexOf("month");
    const day = dayFirst ? numbers[0] : numbers[1];
    const monthNumber = dayFirst ? numbers[1] : numbers[0];
    return build(reference.getFullYear(), monthNumber - 1, day);
  }

  return build(reference.getFullYear(), reference.getMonth(), numbers[0]);
}
