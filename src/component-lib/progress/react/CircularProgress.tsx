"use client";

import { useId, useMemo, type CSSProperties, type ReactNode, type Ref } from "react";
import { describeProgress } from "../core/progress";
import type { ProgressLocaleText, ProgressVariant } from "../core/types";
import { defaultProgressText } from "./locale";
import { cx, type CircularProgressSlot } from "./props";

export interface CircularProgressProps {
  value?: number | null;
  max?: number;
  /** Diameter in pixels. Default 44. */
  size?: number;
  /** Ring thickness in pixels. Default 4. */
  thickness?: number;
  variant?: ProgressVariant;
  /** Names the ring for assistive technology. */
  label?: string;
  /** Print the percentage in the middle, or your own node. */
  showValue?: boolean;
  children?: ReactNode;
  className?: string;
  classNames?: Partial<Record<CircularProgressSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<ProgressLocaleText>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The same progress as a ring, for a tile or a table cell where a bar would be
 * too wide.
 *
 * The arc is one circle with a dashed stroke: the dash is the whole
 * circumference, and the gap moves it — no arc paths, no trigonometry, and it
 * scales with `size` without redrawing anything.
 */
export function CircularProgress(props: CircularProgressProps) {
  const {
    ref,
    value = null,
    max = 100,
    size = 44,
    thickness = 4,
    variant = "accent",
    label,
    showValue = false,
    children,
    className,
    classNames,
    style,
    localeText,
  } = props;

  const id = useId();
  const text = useMemo(() => ({ ...defaultProgressText, ...localeText }), [localeText]);
  const state = describeProgress(value, max);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // An indeterminate ring shows a quarter arc that spins; a determinate one
  // shows its fraction.
  const filled = state.indeterminate ? 0.25 : state.fraction;

  return (
    <div
      ref={ref}
      className={cx("pr-circle", classNames?.root, className)}
      style={{ ...style, width: size, height: size }}
      data-variant={variant}
      data-indeterminate={state.indeterminate || undefined}
      role="progressbar"
      aria-valuenow={state.indeterminate ? undefined : state.value ?? undefined}
      aria-valuemin={state.indeterminate ? undefined : 0}
      aria-valuemax={state.indeterminate ? undefined : max}
      aria-valuetext={state.indeterminate ? undefined : text.valueText(state.percent)}
      aria-label={label ?? text.label}
    >
      <svg className={cx("pr-svg", classNames?.svg)} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className={cx("pr-circle-track", classNames?.track)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
        />
        <circle
          className={cx("pr-circle-bar", classNames?.bar)}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
        />
      </svg>
      {(showValue || children) && (
        <span className={cx("pr-circle-label", classNames?.label)} aria-hidden="true" id={`${id}-label`}>
          {children ?? (state.indeterminate ? "" : `${state.percent}%`)}
        </span>
      )}
    </div>
  );
}
