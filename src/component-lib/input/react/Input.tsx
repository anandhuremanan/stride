"use client";

import {
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import { countCharacters } from "../core/count";
import type { FieldSize, InputLocaleText } from "../core/types";
import { setNativeValue } from "./dom";
import { EyeIcon, EyeOffIcon, XIcon } from "./icons";
import { defaultInputText } from "./locale";
import { cx, type InputSlot } from "./props";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix" | "value" | "defaultValue"> {
  value?: string;
  defaultValue?: string;
  /** The new text on every change. The native `onChange` fires as well. */
  onValueChange?(value: string): void;
  /** The field's name, shown above it and linked to it. */
  label?: ReactNode;
  /** A hint under the label, linked as the field's description. */
  description?: ReactNode;
  /** Message below the field; also marks it invalid. */
  error?: ReactNode;
  /** Default `md`. */
  size?: FieldSize;
  /** Content before the text, e.g. an icon or "https://". */
  leading?: ReactNode;
  /** Content after the text, e.g. a unit such as "kg". */
  trailing?: ReactNode;
  /** A button that empties the field. Default false. */
  clearable?: boolean;
  /** For `type="password"`, a button that shows the text. Default true. */
  revealPassword?: boolean;
  /** A character counter under the field; shows `count / maxLength` when `maxLength` is set. */
  showCount?: boolean;
  classNames?: Partial<Record<InputSlot, string>>;
  localeText?: Partial<InputLocaleText>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A text field with label, hint, error, adornments, clear and password-reveal
 * buttons and a character counter. Every other prop goes to the `<input>`, so
 * it works with native forms and form libraries unchanged.
 */
export function Input(props: InputProps) {
  const {
    ref,
    value: valueProp,
    defaultValue,
    onChange,
    onValueChange,
    label,
    description,
    error,
    size = "md",
    leading,
    trailing,
    clearable = false,
    revealPassword = true,
    showCount = false,
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    type = "text",
    disabled,
    readOnly,
    required,
    maxLength,
    "aria-describedby": describedByProp,
    ...inputProps
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultInputText, ...localeText }), [localeText]);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  // Mirrors the text even when uncontrolled, for the counter and the clear button.
  const [current, setCurrent] = useControllableState(valueProp, defaultValue ?? "");
  const [revealed, setRevealed] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCurrent(event.target.value);
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  const clear = () => {
    const input = inputRef.current;
    if (!input) return;
    // A real input event, so onChange and form libraries see the change too.
    setNativeValue(input, "");
    input.focus();
  };

  const invalid = Boolean(error);
  const isPassword = type === "password";
  const count = countCharacters(current);
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("in-root", classNames?.root, className)}
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
        className={cx("in-control", classNames?.control)}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
        data-invalid={invalid ? "" : undefined}
        // A press on the padding or an adornment focuses the text, like a native field.
        onMouseDown={(event) => {
          const target = event.target as Element;
          if (target === inputRef.current || target.closest("button") || disabled) return;
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {leading && (
          <span className="in-adornment" data-side="leading">
            {leading}
          </span>
        )}
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={cx("in-input", classNames?.input)}
          value={valueProp}
          defaultValue={valueProp === undefined ? defaultValue : undefined}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          maxLength={maxLength}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
        />
        {clearable && current !== "" && !disabled && !readOnly && (
          <button
            type="button"
            tabIndex={-1}
            className="in-icon-button"
            aria-label={text.clear}
            title={text.clear}
            onClick={clear}
          >
            <XIcon />
          </button>
        )}
        {isPassword && revealPassword && (
          <button
            type="button"
            className="in-icon-button"
            aria-label={revealed ? text.hidePassword : text.showPassword}
            title={revealed ? text.hidePassword : text.showPassword}
            aria-pressed={revealed}
            aria-controls={id}
            disabled={disabled}
            onClick={() => setRevealed((shown) => !shown)}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
        {trailing && (
          <span className="in-adornment" data-side="trailing">
            {trailing}
          </span>
        )}
      </div>

      {(description || showCount) && (
        <div className="in-footer">
          {description && (
            <span id={`${id}-description`} className={cx("in-description", classNames?.description)}>
              {description}
            </span>
          )}
          {showCount && (
            <span
              className={cx("in-count", classNames?.count)}
              data-over={maxLength !== undefined && count > maxLength ? "" : undefined}
            >
              {text.characterCount(String(count), maxLength !== undefined ? String(maxLength) : undefined)}
            </span>
          )}
        </div>
      )}
      {error && (
        <span id={`${id}-error`} className={cx("in-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
