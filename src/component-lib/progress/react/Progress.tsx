"use client";

import {
  useId,
  useMemo,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { describeProgress } from "../core/progress";
import type { ProgressLocaleText, ProgressSize, ProgressVariant } from "../core/types";
import { defaultProgressText } from "./locale";
import { cx, type ProgressSlot } from "./props";

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  /** How far along. `null` means the length is not known yet. */
  value?: number | null;
  /** What `value` is measured against. Default 100. */
  max?: number;
  /** Names the bar. Shown above it, and used as the accessible name. */
  label?: ReactNode;
  /** Show the percentage beside the label. */
  showValue?: boolean;
  /** Replace what is shown and read, e.g. "3.2 MB of 8 MB". */
  valueText?: ReactNode;
  /** Default `accent`. */
  variant?: ProgressVariant;
  /** Default `md`. */
  size?: ProgressSize;
  classNames?: Partial<Record<ProgressSlot, string>>;
  localeText?: Partial<ProgressLocaleText>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A bar for something with a known end: an upload, an import, a quota.
 *
 * Use a **Spinner** when there is nothing to measure and nothing to say about
 * how long it will take. A progress bar that spends its life indeterminate is
 * a spinner drawn as a promise it cannot keep.
 */
export function Progress(props: ProgressProps) {
  const {
    ref,
    value = null,
    max = 100,
    label,
    showValue = false,
    valueText,
    variant = "accent",
    size = "md",
    className,
    classNames,
    style,
    localeText,
    id: idProp,
    "aria-label": ariaLabel,
    ...rest
  } = props;

  const reactId = useId();
  const id = idProp ?? reactId;
  const text = useMemo(() => ({ ...defaultProgressText, ...localeText }), [localeText]);
  const state = describeProgress(value, max);
  const shown = valueText ?? (state.indeterminate ? text.working : text.valueText(state.percent));

  return (
    <div
      {...rest}
      ref={ref}
      id={id}
      className={cx("pr-root", classNames?.root, className)}
      style={style}
      data-variant={variant}
      data-size={size}
      data-indeterminate={state.indeterminate || undefined}
    >
      {(label || showValue) && (
        <div className={cx("pr-header", classNames?.header)}>
          {label && (
            <span id={`${id}-label`} className={cx("pr-label", classNames?.label)}>
              {label}
            </span>
          )}
          {showValue && <span className={cx("pr-value", classNames?.value)}>{shown}</span>}
        </div>
      )}

      <div
        className={cx("pr-track", classNames?.track)}
        role="progressbar"
        // No aria-valuenow at all while the length is unknown: that is what
        // tells a screen reader to say "busy" rather than to read out a zero.
        aria-valuenow={state.indeterminate ? undefined : state.value ?? undefined}
        aria-valuemin={state.indeterminate ? undefined : 0}
        aria-valuemax={state.indeterminate ? undefined : max}
        aria-valuetext={state.indeterminate ? undefined : typeof shown === "string" ? shown : undefined}
        // The visible label names the bar when there is one, so the name and
        // what is on screen can never drift apart.
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-label={label ? undefined : (ariaLabel ?? text.label)}
      >
        <div
          className={cx("pr-bar", classNames?.bar)}
          // Drawn from the unrounded fraction, so the bar does not reach the
          // end while the last of the work is still going.
          style={{ "--pr-fraction": state.fraction } as CSSProperties}
        />
      </div>
    </div>
  );
}
