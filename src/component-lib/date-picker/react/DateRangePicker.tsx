"use client";

import {
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type Ref,
} from "react";
import { describeField } from "../../shared/core/field";
import { toDate, toISODate } from "../core/calendar";
import { inputPlaceholder } from "../core/format";
import type { DateInput, DateRange } from "../core/types";
import { CalendarPanel, type DatePreset } from "./CalendarPanel";
import { CalendarIcon, XIcon } from "./icons";
import { defaultDatePickerText } from "./locale";
import { DatePickerPopover } from "./Popover";
import { cx, type DatePickerHandle, type DatePickerSharedProps } from "./props";
import { useDatePicker, type RangeField } from "./useDatePicker";

/** A range as it comes in from props: each end may be a Date, an ISO string or a timestamp. */
export interface DateRangeInput {
  start: DateInput | null;
  end: DateInput | null;
}

export interface DateRangePickerProps extends DatePickerSharedProps {
  value?: DateRangeInput | null;
  defaultValue?: DateRangeInput | null;
  /** `complete` is false on the first of the two clicks. */
  onChange?(range: DateRange, complete: boolean): void;
  /** Shortcuts shown beside the calendar ("Last 7 days"). */
  presets?: readonly DatePreset[];
  /** Close the calendar once both ends are chosen. Default true. */
  closeOnSelect?: boolean;
  ref?: Ref<DatePickerHandle<DateRange>>;
}

const EMPTY: DateRange = { start: null, end: null };

const toRange = (input: DateRangeInput | null | undefined): DateRange => ({
  start: toDate(input?.start),
  end: toDate(input?.end),
});

/** Two dates in one field: pick the start, then the end, with a live preview between. */
export function DateRangePicker(props: DateRangePickerProps) {
  const {
    ref,
    value,
    defaultValue,
    onChange,
    presets,
    closeOnSelect = true,
    min,
    max,
    isDateDisabled,
    locale,
    weekStartsOn,
    format,
    numberOfMonths = 2,
    showWeekNumbers = false,
    showToday = false,
    allowInput = true,
    fixedWeeks = true,
    label,
    description,
    error,
    placeholder,
    required = false,
    disabled = false,
    readOnly = false,
    clearable = true,
    size = "md",
    name,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
    onOpenChange,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const popoverId = `${id}-popover`;
  const text = useMemo(() => ({ ...defaultDatePickerText, ...localeText }), [localeText]);

  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLInputElement>(null);

  const minDate = useMemo(() => toDate(min), [min]);
  const maxDate = useMemo(() => toDate(max), [max]);
  const selection = useMemo<DateRange | undefined>(
    () => (value === undefined ? undefined : toRange(value)),
    [value],
  );
  // Read once, as for any uncontrolled input.
  const [initial] = useState<DateRange>(() => (defaultValue ? toRange(defaultValue) : EMPTY));

  const picker = useDatePicker({
    range: true,
    value: selection,
    defaultValue: initial,
    onSelectionChange: (next, complete) => onChange?.(next, complete),
    min: minDate,
    max: maxDate,
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
  });

  const { start, end } = picker.selection;
  const message = error ?? picker.inputError;
  const invalid = Boolean(message);
  const hasValue = start !== null || end !== null;

  useImperativeHandle(
    ref,
    () => ({
      open: () => picker.setOpen(true),
      close: () => picker.setOpen(false),
      toggle: () => picker.setOpen(!picker.open),
      focus: () => startRef.current?.focus({ preventScroll: true }),
      clear: picker.clear,
      getValue: () => picker.selection,
    }),
    [picker],
  );

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || (event.key === "Enter" && !picker.open)) {
      event.preventDefault();
      picker.setOpen(true);
    } else if (event.key === "Escape" && picker.open) {
      picker.setOpen(false);
    }
  };

  const describedBy = describeField(id, { description, error: message });

  const field = (name: RangeField, fieldRef?: Ref<HTMLInputElement>) => (
    <input
      ref={fieldRef}
      id={`${id}-${name}`}
      className={cx("dp-input", classNames?.input)}
      value={picker.inputValue(name)}
      placeholder={placeholder ?? inputPlaceholder(locale)}
      disabled={disabled}
      readOnly={readOnly || !allowInput}
      required={required}
      autoComplete="off"
      spellCheck={false}
      aria-label={name === "start" ? text.startDate : text.endDate}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => picker.onInputChange(name, event.target.value)}
      onBlur={() => picker.onInputBlur(name)}
      onKeyDown={onInputKeyDown}
      onClick={allowInput ? undefined : () => !disabled && picker.setOpen(true)}
    />
  );

  return (
    <div
      className={cx("dp-root", "dp-root-range", classNames?.root, className)}
      style={style}
      data-size={size}
      data-state={picker.open ? "open" : "closed"}
      data-invalid={invalid ? "" : undefined}
    >
      {label && (
        <span
          id={`${id}-label`}
          className={cx("dp-label", classNames?.label)}
          data-required={required || undefined}
        >
          {label}
        </span>
      )}

      <div
        ref={controlRef}
        className={cx("dp-control", classNames?.control)}
        role="group"
        aria-labelledby={label ? `${id}-label` : undefined}
        data-disabled={disabled || undefined}
        data-invalid={invalid ? "" : undefined}
      >
        {field("start", startRef)}
        <span className="dp-separator" aria-hidden="true">
          –
        </span>
        {field("end")}

        <span className="dp-actions">
          {clearable && hasValue && !disabled && !readOnly && (
            <button
              type="button"
              tabIndex={-1}
              className="dp-icon-button"
              aria-label={text.clear}
              onClick={picker.clear}
            >
              <XIcon width={14} height={14} />
            </button>
          )}
          <button
            ref={triggerRef}
            type="button"
            className="dp-icon-button dp-trigger"
            aria-label={text.openCalendar}
            aria-haspopup="dialog"
            aria-expanded={picker.open}
            aria-controls={picker.open ? popoverId : undefined}
            disabled={disabled}
            onPointerDown={picker.onTriggerPointerDown}
            onClick={picker.onTriggerClick}
          >
            <CalendarIcon />
          </button>
        </span>
      </div>

      {name && (
        <>
          <input type="hidden" name={`${name}-start`} value={start ? toISODate(start) : ""} />
          <input type="hidden" name={`${name}-end`} value={end ? toISODate(end) : ""} />
        </>
      )}
      {description && (
        <span id={`${id}-description`} className="dp-description">
          {description}
        </span>
      )}
      {message && (
        <span id={`${id}-error`} className="dp-error" role="alert">
          {message}
        </span>
      )}

      {picker.anchor && (
        <DatePickerPopover
          anchor={picker.anchor}
          onClose={picker.onPopoverClose}
          label={text.calendarLabel}
          id={popoverId}
          autoFocus={picker.gridFocus}
          className={classNames?.popover}
        >
          <CalendarPanel
            picker={picker}
            text={text}
            locale={locale}
            showWeekNumbers={showWeekNumbers}
            showToday={showToday}
            clearable={clearable}
            hasValue={hasValue}
            classNames={classNames}
            presets={presets}
            onPreset={(preset) => {
              picker.applyRange(toRange(preset.range));
              if (closeOnSelect) picker.closeAndFocusTrigger();
            }}
          />
        </DatePickerPopover>
      )}

      <span className="dp-sr-only" role="status">
        {start && end
          ? text.selectedRange(picker.formatValue(start), picker.formatValue(end))
          : start
            ? text.selectedDate(picker.formatValue(start))
            : ""}
      </span>
    </div>
  );
}
