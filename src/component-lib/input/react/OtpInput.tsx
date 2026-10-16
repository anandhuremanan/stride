"use client";

import {
  Fragment,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { describeField } from "../../shared/core/field";
import {
  activeCell,
  cellAt,
  otpInputMode,
  otpPattern,
  sanitizeOtp,
  separatorsAfter,
} from "../core/otp";
import type { FieldSize, InputLocaleText, OtpMode } from "../core/types";
import { defaultInputText } from "./locale";
import { cx, type OtpSlot } from "./props";

export interface OtpInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size" | "prefix" | "value" | "defaultValue" | "type" | "maxLength" | "minLength" | "pattern" | "inputMode"
  > {
  /** Number of characters. Default 6. */
  length?: number;
  /** Default `numeric`. */
  mode?: OtpMode;
  /** Turn letters into capitals as they are typed. */
  uppercase?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  /** Every cell is filled. */
  onComplete?(value: string): void;
  /** Group sizes with a separator between them, e.g. `[3, 3]`. */
  groups?: number[];
  /** Show dots instead of the characters. */
  mask?: boolean;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  size?: FieldSize;
  classNames?: Partial<Record<OtpSlot, string>>;
  localeText?: Partial<InputLocaleText>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A one-time-code field. It is a single real `<input>` drawn as separate cells,
 * so SMS autofill, paste, password managers and screen readers treat it as one
 * field, the way they expect.
 */
export function OtpInput(props: OtpInputProps) {
  const {
    ref,
    length = 6,
    mode = "numeric",
    uppercase = false,
    value: valueProp,
    defaultValue = "",
    onValueChange,
    onComplete,
    groups,
    mask = false,
    label,
    description,
    error,
    size = "md",
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    disabled,
    readOnly,
    required,
    autoComplete = "one-time-code",
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onSelect,
    onClick,
    "aria-describedby": describedByProp,
    "aria-label": ariaLabel,
    ...inputProps
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultInputText, ...localeText }), [localeText]);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellsRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const [internal, setInternal] = useState(() => sanitizeOtp(defaultValue, length, mode, uppercase));
  const value = valueProp !== undefined ? sanitizeOtp(valueProp, length, mode, uppercase) : internal;
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);

  /** Once the code is full, the caret selects one character so typing replaces it. */
  const selectAt = (input: HTMLInputElement, index: number) => {
    if (input.value.length >= length) {
      const at = Math.max(0, Math.min(index, length - 1));
      input.setSelectionRange(at, at + 1);
    } else {
      const at = Math.max(0, Math.min(index, input.value.length));
      input.setSelectionRange(at, at);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeOtp(event.target.value, length, mode, uppercase);
    if (valueProp === undefined) setInternal(next);
    onChange?.(event);
    onValueChange?.(next);
    if (next.length === length && next !== value) onComplete?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    const input = event.currentTarget;
    // Before the code is full the caret is collapsed, and native movement works.
    if (event.defaultPrevented || event.shiftKey || input.value.length < length) return;
    const start = input.selectionStart ?? 0;
    const target: Record<string, number> = {
      ArrowLeft: start - 1,
      ArrowRight: start + 1,
      Home: 0,
      End: length - 1,
    };
    if (!(event.key in target)) return;
    event.preventDefault();
    selectAt(input, target[event.key]);
  };

  const invalid = Boolean(error);
  const separators = separatorsAfter(groups, length);
  const active = focused ? activeCell(value.length, length, caret) : -1;
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("in-root", "in-otp-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      {label && (
        <label htmlFor={id} className={cx("in-label", classNames?.label)} data-required={required || undefined}>
          {label}
        </label>
      )}

      <div
        ref={cellsRef}
        className={cx("in-otp", classNames?.cells)}
        dir="ltr"
        data-focused={focused || undefined}
        data-disabled={disabled || undefined}
        data-invalid={invalid ? "" : undefined}
      >
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          className="in-otp-input"
          type={mask ? "password" : "text"}
          value={value}
          inputMode={otpInputMode(mode)}
          pattern={otpPattern(mode, length)}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize={uppercase ? "characters" : "off"}
          spellCheck={false}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-label={ariaLabel ?? (label ? undefined : text.otpLabel)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={(event) => {
            setFocused(true);
            selectAt(event.currentTarget, event.currentTarget.value.length);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onSelect={(event) => {
            const input = event.currentTarget;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? start;
            if (input.value.length >= length && start === end) selectAt(input, start);
            else setCaret(start);
            onSelect?.(event);
          }}
          // The text is invisible, so place the caret by the cell that was clicked.
          onClick={(event) => {
            const cells = cellsRef.current?.querySelectorAll<HTMLElement>("[data-cell]");
            if (cells) {
              const index = cellAt(Array.from(cells, (cell) => cell.getBoundingClientRect()), event.clientX);
              selectAt(event.currentTarget, index);
            }
            onClick?.(event);
          }}
        />
        {Array.from({ length }, (_, index) => {
          const char = value[index];
          return (
            <Fragment key={index}>
              <span
                data-cell=""
                className={cx("in-otp-cell", classNames?.cell)}
                data-active={index === active || undefined}
                data-filled={char ? "" : undefined}
                aria-hidden="true"
              >
                {char ? (mask ? "•" : char) : index === active ? <span className="in-otp-caret" /> : null}
              </span>
              {separators.has(index) && (
                <span className={cx("in-otp-separator", classNames?.separator)} aria-hidden="true" />
              )}
            </Fragment>
          );
        })}
      </div>

      {description && (
        <span id={`${id}-description`} className={cx("in-description", classNames?.description)}>
          {description}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={cx("in-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
