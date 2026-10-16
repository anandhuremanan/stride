/*
 * Turning what a person wrote into what the column stores.
 *
 * This is the layer that exists so a model never has to do arithmetic. "1
 * lakh" is 100000 every single time here; ask a model and it is 100000 almost
 * every time, which is worse, because the failures are silent and look like
 * data. The same goes for "last quarter", for "20%" on a column that stores
 * 0.2, and for "kerala" where the data says "Kerala".
 *
 * Every conversion that changes the caller's input leaves a note, so the
 * confirmation UI can show its working:
 *
 *   you asked    revenue above 1 lakh
 *   reading as   revenue > ₹1,00,000
 */

import { parseQuantity } from "../../shared/core/agent";
import type { FilterOperator, FilterValue } from "../core/types";
import { toTime } from "../core/values";
import type { GridContractColumn } from "./contract";

export interface CoercionNote {
  code: string;
  message: string;
}

export type CoercionOutcome =
  | { ok: true; value: FilterValue | undefined; notes: CoercionNote[] }
  | { ok: false; code: string; message: string; suggestion?: string };

// ------------------------------------------------------------- near matching

const distance = (a: string, b: string): number => {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = previous[j];
      previous[j] = next;
    }
  }
  return previous[b.length];
};

/** The closest of `candidates` to `text`, or null when nothing is close. */
export function nearest(text: string, candidates: readonly string[]): string | null {
  const needle = text.trim().toLowerCase();
  if (needle === "") return null;

  let best: { value: string; score: number } | null = null;
  for (const candidate of candidates) {
    const hay = candidate.toLowerCase();
    const score = hay === needle ? 0 : hay.includes(needle) || needle.includes(hay) ? 1 : distance(needle, hay) + 1;
    if (!best || score < best.score) best = { value: candidate, score };
  }
  if (!best) return null;
  const tolerance = Math.max(2, Math.floor(needle.length * 0.4)) + 1;
  return best.score <= tolerance ? best.value : null;
}

// --------------------------------------------------------------- date phrases

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const shift = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export interface DateRange {
  from: string;
  to: string;
  /** True when the phrase names a single day. */
  single: boolean;
}

/**
 * Resolves the relative date phrases the coercion layer understands. Anything
 * not on this list is left alone and parsed as a date, so an unknown phrase
 * fails loudly rather than resolving to something plausible but wrong.
 *
 * Weeks start on Monday.
 */
export function resolveRelativeDate(text: string, now: Date = new Date()): DateRange | null {
  const phrase = text.trim().toLowerCase().replace(/\s+/g, " ");
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const day = (date: Date): DateRange => ({ from: iso(date), to: iso(date), single: true });
  const span = (from: Date, to: Date): DateRange => ({ from: iso(from), to: iso(to), single: false });

  switch (phrase) {
    case "today":
      return day(today);
    case "yesterday":
      return day(shift(today, -1));
    case "tomorrow":
      return day(shift(today, 1));
    default:
      break;
  }

  const startOfWeek = (date: Date) => shift(date, -((date.getDay() + 6) % 7));
  const quarter = (date: Date) => Math.floor(date.getMonth() / 3);

  switch (phrase) {
    case "this week":
      return span(startOfWeek(today), today);
    case "last week": {
      const start = shift(startOfWeek(today), -7);
      return span(start, shift(start, 6));
    }
    case "this month":
      return span(new Date(today.getFullYear(), today.getMonth(), 1), today);
    case "last month": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return span(start, new Date(today.getFullYear(), today.getMonth(), 0));
    }
    case "this quarter":
      return span(new Date(today.getFullYear(), quarter(today) * 3, 1), today);
    case "last quarter": {
      const start = new Date(today.getFullYear(), quarter(today) * 3 - 3, 1);
      return span(start, new Date(start.getFullYear(), start.getMonth() + 3, 0));
    }
    case "this year":
      return span(new Date(today.getFullYear(), 0, 1), today);
    case "last year":
      return span(new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31));
    default:
      break;
  }

  const rolling = /^(?:in\s+the\s+)?(?:last|past)\s+(\d{1,4})\s+(day|week|month|year)s?$/.exec(phrase);
  if (rolling) {
    const amount = Number(rolling[1]);
    const unit = rolling[2];
    const start = new Date(today);
    if (unit === "day") start.setDate(start.getDate() - amount);
    if (unit === "week") start.setDate(start.getDate() - amount * 7);
    if (unit === "month") start.setMonth(start.getMonth() - amount);
    if (unit === "year") start.setFullYear(start.getFullYear() - amount);
    return span(start, today);
  }

  return null;
}

// ------------------------------------------------------------------- booleans

const TRUE_WORDS = new Set(["true", "yes", "y", "1", "on", "enabled"]);
const FALSE_WORDS = new Set(["false", "no", "n", "0", "off", "disabled"]);

// --------------------------------------------------------------------- values

export interface CoerceOptions {
  /** Reference date for relative phrases. Injected so tests are stable. */
  now?: Date;
}

/** Canonical form of one option value written by a caller, or null. */
function matchOption(
  column: GridContractColumn,
  raw: unknown,
): { value: string | number; exact: boolean } | null {
  const options = column.options;
  if (!options) return null;
  for (const option of options) if (option.value === raw) return { value: option.value, exact: true };

  const text = String(raw).trim().toLowerCase();
  for (const option of options) {
    if (String(option.value).toLowerCase() === text || option.label.toLowerCase() === text) {
      return { value: option.value, exact: false };
    }
  }
  return null;
}

function coerceScalar(
  column: GridContractColumn,
  raw: unknown,
  options: CoerceOptions,
  notes: CoercionNote[],
): CoercionOutcome {
  const note = (code: string, message: string) => notes.push({ code, message });

  if (raw === null) return { ok: true, value: null, notes };

  // A closed option set wins over the column's nominal type.
  if (column.options) {
    const matched = matchOption(column, raw);
    if (!matched) {
      const labels = column.options.map((option) => option.label);
      const guess = nearest(String(raw), [...labels, ...column.options.map((o) => String(o.value))]);
      return {
        ok: false,
        code: "unknown-option",
        message: `${column.label} has no option "${String(raw)}"`,
        ...(guess ? { suggestion: `Did you mean "${guess}"?` } : {}),
      };
    }
    if (!matched.exact) note("option-normalised", `Read "${String(raw)}" as "${matched.value}".`);
    return { ok: true, value: matched.value, notes };
  }

  switch (column.type) {
    case "number": {
      const quantity = parseQuantity(raw as string | number);
      if (!quantity) {
        return {
          ok: false,
          code: "not-a-number",
          message: `${column.label} is a number, and "${String(raw)}" is not one`,
        };
      }
      let value = quantity.value;

      if (quantity.scale) note("scale-applied", `Read "${String(raw)}" as ${value}.`);
      if (quantity.currency && column.unit && quantity.currency !== column.unit) {
        note(
          "currency-mismatch",
          `Written in ${quantity.currency}; ${column.label} is in ${column.unit}. No conversion was applied.`,
        );
      }

      const basis = column.percentBasis ?? (column.unit === "%" ? "whole" : undefined);
      if (basis === "fraction") {
        if (quantity.percent) {
          value = value / 100;
          note("percent-converted", `${column.label} stores fractions, so ${quantity.value}% is ${value}.`);
        } else if (Math.abs(value) > 1) {
          value = value / 100;
          note(
            "percent-basis-assumed",
            `${column.label} stores fractions, so ${quantity.value} was read as ${value}.`,
          );
        }
      } else if (quantity.percent && basis === undefined) {
        note("percent-ignored", `${column.label} is not a percentage; the % sign was ignored.`);
      }

      return { ok: true, value, notes };
    }

    case "date": {
      if (typeof raw === "string") {
        const range = resolveRelativeDate(raw, options.now);
        if (range) {
          note("relative-date", `Read "${raw}" as ${range.from}${range.single ? "" : ` to ${range.to}`}.`);
          return { ok: true, value: range.from, notes };
        }
      }
      const time = toTime(raw);
      if (time === null) {
        return {
          ok: false,
          code: "not-a-date",
          message: `${column.label} is a date, and "${String(raw)}" is not one`,
          suggestion: "Use YYYY-MM-DD, or a phrase such as \"last month\".",
        };
      }
      const value = iso(new Date(time));
      if (value !== raw) note("date-normalised", `Read "${String(raw)}" as ${value}.`);
      return { ok: true, value, notes };
    }

    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw, notes };
      const text = String(raw).trim().toLowerCase();
      if (TRUE_WORDS.has(text)) return { ok: true, value: true, notes };
      if (FALSE_WORDS.has(text)) return { ok: true, value: false, notes };
      return {
        ok: false,
        code: "not-a-boolean",
        message: `${column.label} is yes/no, and "${String(raw)}" is neither`,
      };
    }

    default: {
      const text = String(raw);
      const known = column.stats?.kind === "string" ? column.stats.values : undefined;
      // Only exact-match operators care whether the value exists in the data.
      if (known && known.length > 0) {
        const exact = known.find((candidate) => candidate === text);
        if (!exact) {
          const insensitive = known.find((candidate) => candidate.toLowerCase() === text.toLowerCase());
          if (insensitive) {
            note("case-normalised", `Read "${text}" as "${insensitive}".`);
            return { ok: true, value: insensitive, notes };
          }
        }
      }
      return { ok: true, value: text, notes };
    }
  }
}

/**
 * Reads a filter's value, and its upper bound where the operator takes one.
 *
 * A relative phrase that names a span is the one case where coercion changes
 * the operator: "signed up last month" is a range, so `equals` becomes
 * `between`. The rewrite is reported, never silent.
 */
export function coerceFilter(
  column: GridContractColumn,
  operator: FilterOperator,
  value: unknown,
  value2: unknown,
  options: CoerceOptions = {},
): | {
      ok: true;
      operator: FilterOperator;
      value: FilterValue | undefined;
      value2: FilterValue | undefined;
      notes: CoercionNote[];
    }
  | { ok: false; code: string; message: string; suggestion?: string } {
  const notes: CoercionNote[] = [];

  if (operator === "isEmpty" || operator === "isNotEmpty") {
    return { ok: true, operator, value: undefined, value2: undefined, notes };
  }

  if (operator === "in") {
    const list = Array.isArray(value) ? value : [value];
    const out: (string | number)[] = [];
    for (const item of list) {
      const result = coerceScalar(column, item, options, notes);
      if (!result.ok) return result;
      out.push(result.value as string | number);
    }
    return { ok: true, operator, value: out, value2: undefined, notes };
  }

  // A date phrase covering a span widens the operator before anything else.
  if (column.type === "date" && typeof value === "string" && value2 === undefined) {
    const range = resolveRelativeDate(value, options.now);
    if (range && !range.single && (operator === "equals" || operator === "between")) {
      notes.push({
        code: "relative-range",
        message: `Read "${value}" as ${range.from} to ${range.to}${
          operator === "equals" ? ", which is a range rather than a single day" : ""
        }.`,
      });
      return { ok: true, operator: "between", value: range.from, value2: range.to, notes };
    }
  }

  const first = coerceScalar(column, value, options, notes);
  if (!first.ok) return first;

  if (operator !== "between") {
    return { ok: true, operator, value: first.value, value2: undefined, notes };
  }

  if (value2 === undefined) {
    return { ok: true, operator, value: first.value, value2: undefined, notes };
  }
  const second = coerceScalar(column, value2, options, notes);
  if (!second.ok) return second;
  return { ok: true, operator, value: first.value, value2: second.value, notes };
}
