"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { formatDate } from "../core/format";
import type { CalendarDay, CalendarMonth, DatePickerLocaleText } from "../core/types";
import type { WeekdayName } from "../core/format";
import { cx } from "./props";

export interface DayState {
  selected: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
}

interface CalendarProps {
  months: CalendarMonth[];
  weekdays: WeekdayName[];
  locale?: string;
  /** `yyyy-mm-dd` of the one day that is in the tab order. */
  focusedKey: string;
  /** Pull DOM focus to the focused day (false while someone types in the field). */
  gridFocus: boolean;
  showWeekNumbers: boolean;
  text: DatePickerLocaleText;
  dayClassName?: string;
  monthLabel(month: CalendarMonth): string;
  getDayState(date: Date): DayState;
  onSelect(date: Date): void;
  onPreview(date: Date | null): void;
  onKeyDown(event: KeyboardEvent<HTMLElement>): void;
}

const FULL_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

/**
 * One or more month grids. Only the focused day is tabbable; the arrow keys move
 * it, which is the WAI-ARIA grid pattern for a date picker.
 */
export function Calendar({
  months,
  weekdays,
  locale,
  focusedKey,
  gridFocus,
  showWeekNumbers,
  text,
  dayClassName,
  monthLabel,
  getDayState,
  onSelect,
  onPreview,
  onKeyDown,
}: CalendarProps) {
  const ref = useRef<HTMLDivElement>(null);
  // With two months side by side the same day appears twice, so the neighbouring
  // month's days are blanked out rather than rendered as duplicates.
  const hideOutside = months.length > 1;

  useEffect(() => {
    if (!gridFocus) return;
    const day = ref.current?.querySelector<HTMLElement>(`[data-key="${focusedKey}"]`);
    if (day && day !== document.activeElement) day.focus({ preventScroll: true });
  }, [gridFocus, focusedKey]);

  const renderDay = (day: CalendarDay) => {
    if (day.outside && hideOutside) {
      return <td key={day.key} className="dp-cell" aria-hidden="true" />;
    }
    const state = getDayState(day.date);
    const focused = day.key === focusedKey;
    return (
      <td
        key={day.key}
        role="gridcell"
        className="dp-cell"
        aria-selected={state.selected || undefined}
        data-in-range={state.inRange || undefined}
        data-range-start={state.rangeStart || undefined}
        data-range-end={state.rangeEnd || undefined}
      >
        <button
          type="button"
          className={cx("dp-day", dayClassName)}
          data-key={day.key}
          data-autofocus={focused || undefined}
          data-today={day.today || undefined}
          data-outside={day.outside || undefined}
          data-weekend={day.weekend || undefined}
          data-selected={state.selected || undefined}
          tabIndex={focused ? 0 : -1}
          disabled={day.disabled}
          aria-label={formatDate(day.date, locale, FULL_DATE)}
          aria-current={day.today ? "date" : undefined}
          onClick={() => onSelect(day.date)}
          onPointerEnter={() => onPreview(day.date)}
          onFocus={() => onPreview(day.date)}
        >
          {day.day}
        </button>
      </td>
    );
  };

  return (
    <div
      ref={ref}
      className="dp-months"
      onKeyDown={onKeyDown}
      onPointerLeave={() => onPreview(null)}
    >
      {months.map((month) => {
        const label = monthLabel(month);
        return (
          <div key={`${month.year}-${month.month}`} className="dp-month">
            {months.length > 1 && (
              <div className="dp-month-caption" aria-hidden="true">
                {label}
              </div>
            )}
            <table role="grid" aria-label={label} className="dp-grid">
              <thead>
                <tr>
                  {showWeekNumbers && (
                    <th scope="col" className="dp-week-number">
                      <abbr title={text.weekNumber}>#</abbr>
                    </th>
                  )}
                  {weekdays.map((weekday) => (
                    <th key={weekday.long} scope="col" abbr={weekday.long} className="dp-weekday">
                      <span aria-hidden="true">{weekday.short}</span>
                      <span className="dp-sr-only">{weekday.long}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {month.weeks.map((week) => (
                  <tr key={week.days[0].key} role="row">
                    {showWeekNumbers && (
                      <th scope="row" className="dp-week-number">
                        {week.weekNumber}
                      </th>
                    )}
                    {week.days.map(renderDay)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
