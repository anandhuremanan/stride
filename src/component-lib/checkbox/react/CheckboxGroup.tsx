"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { describeField } from "../../shared/core/field";
import { groupState, toggleAll, toggleValue } from "../core/group";
import type { CheckboxLocaleText, CheckboxOption, CheckboxSize } from "../core/types";
import { Checkbox } from "./Checkbox";
import { CheckboxGroupContext, type CheckboxGroupContextValue } from "./context";
import { defaultCheckboxText } from "./locale";
import { cx, type CheckboxGroupSlot } from "./props";

export interface CheckboxGroupProps {
  /** Checked values (controlled). */
  value?: string[];
  /** The values checked to begin with, when you are not controlling `value`. */
  defaultValue?: string[];
  /**
   * The checked values after a change. They accumulate in the order they were
   * checked, not the order the options are declared, so sort before comparing
   * two selections for equality.
   */
  onValueChange?(values: string[]): void;
  /** Render these options, or pass `<Checkbox value="…">` children. */
  options?: readonly CheckboxOption[];
  children?: ReactNode;
  /** The group's name, shown as its legend. */
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Form field name for every checkbox in the group. */
  name?: string;
  size?: CheckboxSize;
  /** Default `vertical`. */
  orientation?: "vertical" | "horizontal";
  /** With `options`, a parent box that checks or clears them all. `true` uses the default label. */
  selectAll?: boolean | ReactNode;
  id?: string;
  className?: string;
  classNames?: Partial<Record<CheckboxGroupSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<CheckboxLocaleText>;
}

/** A labelled set of checkboxes sharing one array of values. */
export function CheckboxGroup(props: CheckboxGroupProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    options,
    children,
    label,
    description,
    error,
    required = false,
    disabled = false,
    name,
    size,
    orientation = "vertical",
    selectAll,
    id: idProp,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultCheckboxText, ...localeText }), [localeText]);
  const [values, setValues] = useControllableState<string[]>(value, defaultValue ?? []);

  const context = useMemo<CheckboxGroupContextValue>(() => {
    const commit = (next: string[]) => {
      setValues(next);
      onValueChange?.(next);
    };
    return {
      values,
      toggle: (item, checked) => commit(toggleValue(values, item, checked)),
      name,
      disabled,
      invalid: Boolean(error),
      size,
    };
  }, [values, setValues, onValueChange, name, disabled, error, size]);

  const showSelectAll = Boolean(selectAll) && options !== undefined && options.length > 0;
  const describedBy = describeField(id, { description, error });

  return (
    <fieldset
      id={id}
      className={cx("ck-group", classNames?.root, className)}
      style={style}
      // A disabled fieldset disables every control inside it natively.
      disabled={disabled}
      aria-describedby={describedBy}
      data-orientation={orientation}
      data-select-all={showSelectAll || undefined}
      data-invalid={error ? "" : undefined}
    >
      {label && (
        <legend className={cx("ck-legend", classNames?.legend)} data-required={required || undefined}>
          {label}
        </legend>
      )}
      {description && (
        <span id={`${id}-description`} className={cx("ck-description", classNames?.description)}>
          {description}
        </span>
      )}

      {showSelectAll && (
        <Checkbox
          className="ck-select-all"
          label={selectAll === true ? text.selectAll : selectAll}
          size={size}
          disabled={disabled}
          checked={groupState(values, options)}
          onCheckedChange={() => {
            const next = toggleAll(values, options);
            setValues(next);
            onValueChange?.(next);
          }}
        />
      )}

      <CheckboxGroupContext value={context}>
        <div className={cx("ck-items", classNames?.items)}>
          {options
            ? options.map((option) => (
                <Checkbox
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  description={option.description}
                  disabled={option.disabled}
                />
              ))
            : children}
        </div>
      </CheckboxGroupContext>

      {error && (
        <span id={`${id}-error`} className={cx("ck-error", classNames?.error)} role="alert">
          {error}
        </span>
      )}
    </fieldset>
  );
}
