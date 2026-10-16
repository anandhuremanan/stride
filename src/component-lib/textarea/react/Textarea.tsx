"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import { countCharacters } from "../core/count";
import { fitHeight } from "../core/size";
import type { FieldSize, TextareaLocaleText, TextareaResize } from "../core/types";
import { defaultTextareaText } from "./locale";
import { cx, type TextareaSlot } from "./props";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue"> {
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
  /** Grow and shrink with the text, between `minRows` and `maxRows`. Default false. */
  autoResize?: boolean;
  /** Smallest height in rows. Default `rows`, or 3. */
  minRows?: number;
  /** Largest height in rows before the text scrolls. No limit by default. */
  maxRows?: number;
  /** Which way people can drag to resize. Default `vertical`, or `none` with `autoResize`. */
  resize?: TextareaResize;
  /** A character counter; shows `count / maxLength` when `maxLength` is set. */
  showCount?: boolean;
  classNames?: Partial<Record<TextareaSlot, string>>;
  localeText?: Partial<TextareaLocaleText>;
  /** The `<textarea>` element. */
  ref?: Ref<HTMLTextAreaElement>;
}

const supportsFieldSizing = () =>
  typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

const px = (value: string) => Number.parseFloat(value) || 0;

/**
 * A multi-line text field with label, hint, error, character counter and
 * auto-resize. Every other prop goes to the `<textarea>`.
 */
export function Textarea(props: TextareaProps) {
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
    autoResize = false,
    minRows,
    maxRows,
    rows,
    resize,
    showCount = false,
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    disabled,
    readOnly,
    required,
    maxLength,
    "aria-describedby": describedByProp,
    ...textareaProps
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultTextareaText, ...localeText }), [localeText]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement, []);

  // Mirrors the text even when uncontrolled, for the counter and auto-resize.
  const [current, setCurrent] = useControllableState(valueProp, defaultValue ?? "");
  const floor = Math.max(1, minRows ?? rows ?? 3);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setCurrent(event.target.value);
    onChange?.(event);
    onValueChange?.(event.target.value);
  };

  // Browsers with `field-sizing: content` resize in CSS; others are measured here.
  const measure = useCallback(() => {
    const element = textareaRef.current;
    if (!autoResize || !element || supportsFieldSizing()) return;
    const computed = getComputedStyle(element);
    const metrics = {
      lineHeight: px(computed.lineHeight) || px(computed.fontSize) * 1.5,
      paddingBlock: px(computed.paddingTop) + px(computed.paddingBottom),
      borderBlock: px(computed.borderTopWidth) + px(computed.borderBottomWidth),
    };
    element.style.height = "auto";
    const { height, overflow } = fitHeight(element.scrollHeight, metrics, floor, maxRows);
    element.style.height = `${height}px`;
    element.style.overflowY = overflow ? "auto" : "hidden";
  }, [autoResize, floor, maxRows]);

  useLayoutEffect(() => {
    measure();
  }, [measure, current]);

  // A narrower field wraps more lines, so measure again when the width changes.
  useEffect(() => {
    const element = textareaRef.current;
    if (!autoResize || !element || supportsFieldSizing()) return;
    let width = element.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return;
      width = element.offsetWidth;
      measure();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoResize, measure]);

  const invalid = Boolean(error);
  const count = countCharacters(current);
  const describedBy = describeField(id, { extra: describedByProp, description, error });
  const rowVariables = {
    "--ta-min-rows": floor,
    "--ta-max-rows": maxRows ?? "none",
  } as CSSProperties;

  return (
    <div
      className={cx("ta-root", classNames?.root, className)}
      style={style}
      data-size={size}
      data-disabled={disabled || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      {label && (
        <label htmlFor={id} className={cx("ta-label", classNames?.label)} data-required={required || undefined}>
          {label}
        </label>
      )}

      <textarea
        {...textareaProps}
        ref={textareaRef}
        id={id}
        className={cx("ta-input", classNames?.textarea)}
        style={rowVariables}
        rows={autoResize ? floor : (rows ?? floor)}
        value={valueProp}
        defaultValue={valueProp === undefined ? defaultValue : undefined}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        maxLength={maxLength}
        data-autoresize={autoResize || undefined}
        data-resize={resize ?? (autoResize ? "none" : "vertical")}
        data-invalid={invalid ? "" : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={handleChange}
      />

      {(description || showCount) && (
        <div className="ta-footer">
          {description && (
            <span id={`${id}-description`} className={cx("ta-description", classNames?.description)}>
              {description}
            </span>
          )}
          {showCount && (
            <span
              className={cx("ta-count", classNames?.count)}
              data-over={maxLength !== undefined && count > maxLength ? "" : undefined}
            >
              {text.characterCount(String(count), maxLength !== undefined ? String(maxLength) : undefined)}
            </span>
          )}
        </div>
      )}
      {error && (
        <span id={`${id}-error`} className={cx("ta-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
