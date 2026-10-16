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
import { CalendarPanel } from "./CalendarPanel";
import { CalendarIcon, XIcon } from "./icons";
import { defaultDatePickerText } from "./locale";
import { DatePickerPopover } from "./Popover";
import { cx, type DatePickerHandle, type DatePickerSharedProps } from "./props";
import { useDatePicker } from "./useDatePicker";

export interface DatePickerProps extends DatePickerSharedProps {
  value?: DateInput | null;
  defaultValue?: DateInput | null;
  /**
   * The chosen day as a `Date` at local midnight, or `null` once cleared.
   * Accepts a string or a number in `value`, but always hands back a
   * `Date`.
   */
  onChange?(date: Date | null): void;
  /** Close the calendar after choosing a date. Default true. */
  closeOnSelect?: boolean;
  ref?: Ref<DatePickerHandle<Date | null>>;
}

/** A single date field with a calendar, typed entry and full keyboard control. */
export function DatePicker(props: DatePickerProps) {
  const {
    ref,
    value,
    defaultValue,
    onChange,
    closeOnSelect = true,
    min,
    max,
    isDateDisabled,
    locale,
    weekStartsOn,
    format,
    numberOfMonths = 1,
    showWeekNumbers = false,
    showToday = true,
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
  const inputId = `${id}-input`;
  const popoverId = `${id}-popover`;
  const text = useMemo(() => ({ ...defaultDatePickerText, ...localeText }), [localeText]);

  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const minDate = useMemo(() => toDate(min), [min]);
  const maxDate = useMemo(() => toDate(max), [max]);
  const selection = useMemo<DateRange | undefined>(
    () => (value === undefined ? undefined : { start: toDate(value), end: null }),
    [value],
  );
  // Read once: later changes to `defaultValue` are ignored, as for any uncontrolled input.
  const [initial] = useState<DateRange>(() => ({ start: toDate(defaultValue), end: null }));

  const picker = useDatePicker({
    range: false,
    value: selection,
    defaultValue: initial,
    onSelectionChange: (next) => onChange?.(next.start),
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

  const selected = picker.selection.start;
  const message = error ?? picker.inputError;
  const invalid = Boolean(message);

  useImperativeHandle(
    ref,
    () => ({
      open: () => picker.setOpen(true),
      close: () => picker.setOpen(false),
      toggle: () => picker.setOpen(!picker.open),
      focus: () => inputRef.current?.focus({ preventScroll: true }),
      clear: picker.clear,
      getValue: () => picker.selection.start,
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

  return (
    <div
      className={cx("dp-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-state={picker.open ? "open" : "closed"}
      data-invalid={invalid ? "" : undefined}
    >
      {label && (
        <label
          htmlFor={inputId}
          className={cx("dp-label", classNames?.label)}
          data-required={required || undefined}
        >
          {label}
        </label>
      )}

      <div
        ref={controlRef}
        className={cx("dp-control", classNames?.control)}
        data-disabled={disabled || undefined}
        data-invalid={invalid ? "" : undefined}
      >
        <input
          ref={inputRef}
          id={inputId}
          className={cx("dp-input", classNames?.input)}
          value={picker.inputValue("start")}
          placeholder={placeholder ?? inputPlaceholder(locale)}
          disabled={disabled}
          readOnly={readOnly || !allowInput}
          required={required}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => picker.onInputChange("start", event.target.value)}
          onBlur={() => picker.onInputBlur("start")}
          onKeyDown={onInputKeyDown}
          onClick={allowInput ? undefined : () => !disabled && picker.setOpen(true)}
        />

        <span className="dp-actions">
          {clearable && selected && !disabled && !readOnly && (
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

      {name && <input type="hidden" name={name} value={selected ? toISODate(selected) : ""} />}
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
            hasValue={selected !== null}
            classNames={classNames}
          />
        </DatePickerPopover>
      )}

      <span className="dp-sr-only" role="status">
        {selected ? text.selectedDate(picker.formatValue(selected)) : ""}
      </span>
    </div>
  );
}
