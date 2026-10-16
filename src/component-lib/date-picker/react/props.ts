import type { CSSProperties, ReactNode } from "react";
import type { DateInput, DatePickerLocaleText, DatePickerSize } from "../core/types";

export type DatePickerSlot =
  | "root"
  | "label"
  | "control"
  | "input"
  | "popover"
  | "calendar"
  | "day"
  | "footer"
  | "presets";

export interface DatePickerHandle<TValue> {
  open(): void;
  close(): void;
  toggle(): void;
  focus(): void;
  clear(): void;
  getValue(): TValue;
}

/** How a chosen date is written in the field: `Intl` options or your own function. */
export type DateFormat =
  | Intl.DateTimeFormatOptions
  | ((date: Date, locale: string | undefined) => string);

export interface DatePickerSharedProps {
  /** Earliest selectable day. Earlier days are shown but cannot be picked. */
  min?: DateInput | null;
  /** Latest selectable day. Later days are shown but cannot be picked. */
  max?: DateInput | null;
  /** Called for every rendered day; return true to block it (weekends, holidays). */
  isDateDisabled?(date: Date): boolean;
  /**
   * BCP-47 tag deciding month names, field order and the first day of the week.
   * Defaults to the runtime's locale — pass it explicitly when you render on a
   * server, so the markup matches what the browser produces.
   */
  locale?: string;
  /** 0 = Sunday. Defaults to the locale's first day of the week. */
  weekStartsOn?: number;
  /**
   * How the chosen date is displayed. `Intl.DateTimeFormatOptions` for the
   * usual cases, or a function for a shape Intl cannot express. Left out,
   * the locale's own date format is used - which is the right default far
   * more often than a hand-written one.
   */
  format?: DateFormat;
  /** Months shown side by side. Default 1, or 2 for the range picker. */
  numberOfMonths?: number;
  /** Number each week down the left of the calendar. Default false. */
  showWeekNumbers?: boolean;
  /** Show the "Today" shortcut in the footer. Default true. */
  showToday?: boolean;
  /** Let people type a date instead of picking one. Default true. */
  allowInput?: boolean;
  /** Always six week rows, so the popover never changes height. Default true. */
  fixedWeeks?: boolean;
  /** The control's name, shown above it and linked to it. */
  label?: ReactNode;
  /** A hint under the label, linked as the control's description. */
  description?: ReactNode;
  /** Message shown below the control; also marks the control invalid. */
  error?: ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Shows the value but blocks typing and picking. */
  readOnly?: boolean;
  /** Show the clear button. Default true. */
  clearable?: boolean;
  /** Default `md`. */
  size?: DatePickerSize;
  /** Posts the value as `yyyy-mm-dd` in a hidden input. */
  name?: string;
  id?: string;
  className?: string;
  classNames?: Partial<Record<DatePickerSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<DatePickerLocaleText>;
  /** The calendar opened or closed. */
  onOpenChange?(open: boolean): void;
}

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
