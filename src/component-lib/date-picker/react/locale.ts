import type { DatePickerLocaleText } from "../core/types";

export const defaultDatePickerText: DatePickerLocaleText = {
  calendarLabel: "Choose a date",
  openCalendar: "Open calendar",
  clear: "Clear",
  today: "Today",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  previousYears: "Previous years",
  nextYears: "Next years",
  chooseMonthYear: "Choose month and year",
  monthPanelLabel: "Choose a month",
  yearPanelLabel: "Choose a year",
  weekNumber: "Week",
  startDate: "Start date",
  endDate: "End date",
  invalidDate: "Enter a valid date",
  outOfRange: "That date is outside the allowed range",
  presets: "Shortcuts",
  selectedDate: (date) => `Selected: ${date}`,
  selectedRange: (start, end) => `Selected: ${start} to ${end}`,
};
