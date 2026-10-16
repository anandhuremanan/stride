"use client";

import type { DateInput, DatePickerLocaleText } from "../core/types";
import { Calendar } from "./Calendar";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { MonthPanel, YearPanel } from "./MonthYearPanels";
import { cx, type DatePickerSlot } from "./props";
import type { DatePickerEngine } from "./useDatePicker";

export interface DatePreset {
  label: string;
  range: { start: DateInput | null; end: DateInput | null };
}

interface CalendarPanelProps {
  picker: DatePickerEngine;
  text: DatePickerLocaleText;
  locale?: string;
  showWeekNumbers: boolean;
  showToday: boolean;
  clearable: boolean;
  hasValue: boolean;
  classNames?: Partial<Record<DatePickerSlot, string>>;
  presets?: readonly DatePreset[];
  onPreset?(preset: DatePreset): void;
}

/** The popover body: navigation, one of the three views, and the footer. */
export function CalendarPanel({
  picker,
  text,
  locale,
  showWeekNumbers,
  showToday,
  clearable,
  hasValue,
  classNames,
  presets,
  onPreset,
}: CalendarPanelProps) {
  const { view } = picker;

  const step = (direction: 1 | -1) => {
    if (view === "days") picker.goToMonth(direction);
    else if (view === "months") picker.goToYear(direction);
    else picker.shiftYearPage(direction);
  };

  const title =
    view === "days"
      ? picker.title
      : view === "months"
        ? String(picker.months[0].year)
        : `${picker.years[0]} – ${picker.years[picker.years.length - 1]}`;

  const nextView = view === "days" ? "months" : view === "months" ? "years" : "days";
  const prevLabel = view === "years" ? text.previousYears : text.previousMonth;
  const nextLabel = view === "years" ? text.nextYears : text.nextMonth;

  return (
    <div className={cx("dp-panel-root", classNames?.calendar)}>
      {presets && presets.length > 0 && (
        <div
          className={cx("dp-presets", classNames?.presets)}
          role="group"
          aria-label={text.presets}
        >
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="dp-preset"
              onClick={() => onPreset?.(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="dp-calendar">
        <div className="dp-nav">
          <button
            type="button"
            className="dp-icon-button dp-nav-step"
            aria-label={prevLabel}
            disabled={view === "days" && !picker.canGoPrev}
            onClick={() => step(-1)}
          >
            <ChevronLeftIcon />
          </button>

          <button
            type="button"
            className="dp-nav-title"
            aria-label={text.chooseMonthYear}
            aria-expanded={view !== "days"}
            onClick={() => picker.setView(nextView)}
          >
            <span>{title}</span>
            <ChevronDownIcon width={14} height={14} className="dp-nav-chevron" />
          </button>

          <button
            type="button"
            className="dp-icon-button dp-nav-step"
            aria-label={nextLabel}
            disabled={view === "days" && !picker.canGoNext}
            onClick={() => step(1)}
          >
            <ChevronRightIcon />
          </button>
        </div>

        {view === "days" && (
          <Calendar
            months={picker.months}
            weekdays={picker.weekdays}
            locale={locale}
            focusedKey={picker.focusedKey}
            gridFocus={picker.gridFocus}
            showWeekNumbers={showWeekNumbers}
            text={text}
            dayClassName={classNames?.day}
            monthLabel={picker.monthLabel}
            getDayState={picker.getDayState}
            onSelect={picker.selectDate}
            onPreview={picker.onPreview}
            onKeyDown={picker.onGridKeyDown}
          />
        )}

        {view === "months" && (
          <MonthPanel
            labels={picker.monthLabels}
            current={picker.months[0].month}
            label={text.monthPanelLabel}
            isMonthDisabled={picker.isMonthDisabled}
            onSelect={picker.selectMonth}
          />
        )}

        {view === "years" && (
          <YearPanel
            years={picker.years}
            current={picker.months[0].year}
            label={text.yearPanelLabel}
            isYearDisabled={picker.isYearDisabled}
            onSelect={picker.selectYear}
          />
        )}

        {(showToday || (clearable && hasValue)) && (
          <div className={cx("dp-footer", classNames?.footer)}>
            {showToday && (
              <button type="button" className="dp-link-button" onClick={picker.goToToday}>
                {text.today}
              </button>
            )}
            {clearable && hasValue && (
              <button type="button" className="dp-link-button" onClick={picker.clear}>
                {text.clear}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
