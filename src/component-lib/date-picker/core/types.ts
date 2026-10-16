/** Values accepted wherever a date comes in: a Date, an ISO `yyyy-mm-dd` string or a timestamp. */
export type DateInput = Date | string | number;

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export type DatePickerSize = "sm" | "md" | "lg";

/** Panel shown inside the popover. */
export type CalendarView = "days" | "months" | "years";

export interface CalendarDay {
  date: Date;
  /** Day of the month, 1-31. */
  day: number;
  /** `yyyy-mm-dd` in local time: a stable key, and safe to compare. */
  key: string;
  /** Belongs to a neighbouring month. */
  outside: boolean;
  today: boolean;
  weekend: boolean;
  disabled: boolean;
}

export interface CalendarWeek {
  /** ISO week number, shown when `showWeekNumbers` is set. */
  weekNumber: number;
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  /** 0-11, as in `Date.prototype.getMonth`. */
  month: number;
  weeks: CalendarWeek[];
}

/** What makes a day unselectable. */
export interface DateLimits {
  min?: Date | null;
  max?: Date | null;
  isDateDisabled?(date: Date): boolean;
}

export interface DatePickerLocaleText {
  calendarLabel: string;
  openCalendar: string;
  clear: string;
  today: string;
  previousMonth: string;
  nextMonth: string;
  previousYears: string;
  nextYears: string;
  /** Button that switches the day grid to the month and year panels. */
  chooseMonthYear: string;
  monthPanelLabel: string;
  yearPanelLabel: string;
  weekNumber: string;
  startDate: string;
  endDate: string;
  invalidDate: string;
  outOfRange: string;
  presets: string;
  selectedDate(date: string): string;
  selectedRange(start: string, end: string): string;
}
