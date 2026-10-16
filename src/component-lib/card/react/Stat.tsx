"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { isPositive, type TrendDirection } from "../core/trend";
import type { StatSlot } from "../core/types";
import { cx } from "./props";

export interface StatTrend {
  /** `up`, `down` or `flat`. `trendDirection(change)` works this out for you. */
  direction: TrendDirection;
  /** What is shown beside the arrow, already formatted, e.g. "12.4%". */
  label: ReactNode;
  /**
   * Down is the good outcome for this figure, as with churn or error rates.
   * Only changes the colour; the arrow still points the way the number moved.
   */
  invert?: boolean;
  /** Read out after the change, e.g. "since last month". */
  description?: ReactNode;
}

export interface StatProps {
  /** What the figure is. Always visible — a number alone means nothing. */
  label: ReactNode;
  value: ReactNode;
  /**
   * The change beside the figure: direction, a formatted label, and
   * whether down is the good outcome. Left out, no arrow is shown.
   */
  trend?: StatTrend;
  /** A note under the figure. */
  help?: ReactNode;
  /** An icon beside the figure, to identify the metric at a glance. */
  icon?: ReactNode;
  /** Shows placeholder bars instead of the figure. */
  loading?: boolean;
  className?: string;
  classNames?: Partial<Record<StatSlot, string>>;
  style?: CSSProperties;
}

const ARROWS: Record<TrendDirection, string> = {
  up: "M12 19V5M5 12l7-7 7 7",
  down: "M12 5v14M19 12l-7 7-7-7",
  flat: "M5 12h14",
};

/** The word behind the arrow, so the direction is not carried by colour alone. */
const DIRECTION_TEXT: Record<TrendDirection, string> = {
  up: "Up",
  down: "Down",
  flat: "No change",
};

/**
 * A single figure with its label and, optionally, how it has changed.
 *
 * Put it inside a `Card` for a dashboard tile, or use it on its own in a row of
 * summary numbers.
 */
export function Stat(props: StatProps) {
  const { label, value, trend, help, icon, loading = false, className, classNames, style } = props;
  const id = useId();
  const positive = trend ? isPositive(trend.direction, trend.invert) : null;

  return (
    <div
      className={cx("st-root", classNames?.root, className)}
      style={style}
      data-loading={loading || undefined}
    >
      <div className="st-head">
        <span id={`${id}-label`} className={cx("st-label", classNames?.label)}>
          {label}
        </span>
        {icon && (
          <span className={cx("st-icon", classNames?.icon)} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <>
          <div className="st-placeholder st-placeholder-value" />
          <div className="st-placeholder st-placeholder-help" />
          <span className="st-sr-only">Loading</span>
        </>
      ) : (
        <>
          <div
            className={cx("st-value", classNames?.value)}
            aria-labelledby={`${id}-label`}
            role="figure"
          >
            {value}
          </div>

          {trend && (
            <div
              className={cx("st-trend", classNames?.trend)}
              data-direction={trend.direction}
              data-positive={positive === null ? undefined : positive}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d={ARROWS[trend.direction]} />
              </svg>
              <span className="st-sr-only">{DIRECTION_TEXT[trend.direction]}</span>
              <span className="st-trend-label">{trend.label}</span>
              {trend.description && (
                <span className="st-trend-description">{trend.description}</span>
              )}
            </div>
          )}

          {help && <div className={cx("st-help", classNames?.help)}>{help}</div>}
        </>
      )}
    </div>
  );
}
