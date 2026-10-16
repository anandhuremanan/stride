"use client";

import {
  use,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import type { CheckboxSize, CheckedState } from "../core/types";
import { CheckboxGroupContext } from "./context";
import { cx, type CheckboxSlot } from "./props";

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "size" | "checked" | "defaultChecked" | "onChange" | "value"
  > {
  /** `true`, `false` or `"indeterminate"` (controlled). */
  checked?: CheckedState;
  /** The starting state when you are not controlling `checked`. */
  defaultChecked?: CheckedState;
  /**
   * The state after a change, as a plain boolean — the handler to reach for.
   * Never fires with `"indeterminate"`: clicking a mixed box resolves it.
   */
  onCheckedChange?(checked: boolean): void;
  /**
   * The underlying DOM event, for form libraries that want the native
   * handler. For reading the new state, `onCheckedChange` is simpler.
   */
  onChange?: ChangeEventHandler<HTMLInputElement>;
  /** Posted with the form when checked. Inside a CheckboxGroup, the value this box adds. */
  value?: string;
  /** The text beside the box. Clicking it toggles the box. */
  label?: ReactNode;
  /** A hint under the label, linked as the box's description. */
  description?: ReactNode;
  /**
   * The validation message. Setting it is enough on its own: the box reads as
   * invalid to assistive technology and the message is announced, so no extra
   * `aria-invalid` is needed.
   */
  error?: ReactNode;
  /** Default `md`, or the size of the CheckboxGroup it sits in. */
  size?: CheckboxSize;
  classNames?: Partial<Record<CheckboxSlot, string>>;
  /** The `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * A native checkbox, styled. It posts with forms, works with form libraries and
 * reads as a checkbox to every assistive technology, including the mixed state.
 */
export function Checkbox(props: CheckboxProps) {
  const {
    ref,
    checked: checkedProp,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    value,
    label,
    description,
    error,
    size,
    className,
    classNames,
    style,
    id: idProp,
    disabled,
    required,
    name,
    "aria-describedby": describedByProp,
    ...inputProps
  } = props;

  const group = use(CheckboxGroupContext);
  const reactId = useId();
  const id = idProp ?? reactId;
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const [own, setOwn] = useControllableState<CheckedState>(checkedProp, defaultChecked);
  const inGroup = group !== null && value !== undefined;
  // Inside a group the group owns the state, whoever owns it outside one.
  const state: CheckedState = inGroup ? group.values.includes(value) : own;

  // "Indeterminate" exists only as a DOM property, not an attribute.
  useLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = state === "indeterminate";
  }, [state]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    if (inGroup) group.toggle(value, next);
    else setOwn(next);
    onChange?.(event);
    onCheckedChange?.(next);
  };

  const invalid = Boolean(error) || (group?.invalid ?? false);
  const describedBy = describeField(id, { extra: describedByProp, description, error });

  return (
    <div
      className={cx("ck-root", classNames?.root, className)}
      style={style}
      data-size={size ?? group?.size ?? "md"}
      data-disabled={disabled || group?.disabled || undefined}
      data-invalid={invalid ? "" : undefined}
    >
      <span className={cx("ck-control", classNames?.control)}>
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type="checkbox"
          className={cx("ck-input", classNames?.input)}
          checked={state === true}
          value={value}
          name={name ?? group?.name}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={handleChange}
        />
        <svg className="ck-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path className="ck-check" d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength={1} />
          <path className="ck-dash" d="M4 8h8" />
        </svg>
      </span>

      {(label || description || error) && (
        <span className="ck-text">
          {label && (
            <label htmlFor={id} className={cx("ck-label", classNames?.label)} data-required={required || undefined}>
              {label}
            </label>
          )}
          {description && (
            <span id={`${id}-description`} className={cx("ck-description", classNames?.description)}>
              {description}
            </span>
          )}
          {error && (
            <span id={`${id}-error`} className={cx("ck-error", classNames?.error)} role="alert">
              {error}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
