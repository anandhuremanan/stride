"use client";

import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { spinnerPixels } from "../core/visibility";
import type { SpinnerLocaleText, SpinnerSize, SpinnerVariant } from "../core/types";
import { defaultSpinnerText } from "./locale";
import { cx, type SpinnerSlot } from "./props";
import { useDelayedLoading } from "./useDelayedLoading";

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Default true. With `children`, the spinner covers them while this is true. */
  loading?: boolean;
  /** Default `md` (24 px); a number is pixels. */
  size?: SpinnerSize | number;
  /** Default `ring`. */
  variant?: SpinnerVariant;
  /** What screen readers announce. Default "Loading". */
  label?: string;
  /** Show the label next to the spinner. */
  showLabel?: boolean;
  /** Milliseconds to wait before showing, so fast work doesn't flash. Default 0. */
  delay?: number;
  /** Once shown, stay at least this many milliseconds. Default 0. */
  minDuration?: number;
  /** Content to cover while loading. It becomes inert, so it can't be clicked or focused. */
  children?: ReactNode;
  classNames?: Partial<Record<SpinnerSlot, string>>;
  localeText?: Partial<SpinnerLocaleText>;
}

/** A loading indicator, on its own or covering content that is busy. */
export function Spinner(props: SpinnerProps) {
  const {
    loading = true,
    size = "md",
    variant = "ring",
    label,
    showLabel = false,
    delay = 0,
    minDuration = 0,
    children,
    className,
    classNames,
    style,
    localeText,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultSpinnerText, ...localeText }), [localeText]);
  const visible = useDelayedLoading(loading, { delay, minDuration });
  const sized = { "--sp-size": `${spinnerPixels(size)}px`, ...style } as CSSProperties;

  const status = (
    <span role="status" className={cx("sp-status", classNames?.status)}>
      <span className={cx("sp-indicator", classNames?.indicator)} data-variant={variant} aria-hidden="true">
        {variant === "dots" ? (
          <>
            <span className="sp-dot" />
            <span className="sp-dot" />
            <span className="sp-dot" />
          </>
        ) : (
          <svg className="sp-ring" viewBox="0 0 24 24" focusable="false">
            <circle className="sp-track" cx="12" cy="12" r="9.5" />
            <circle className="sp-arc" cx="12" cy="12" r="9.5" pathLength={100} />
          </svg>
        )}
      </span>
      <span className={showLabel ? cx("sp-label", classNames?.label) : "sp-sr-only"}>{label ?? text.loading}</span>
    </span>
  );

  if (children === undefined) {
    if (!visible) return null;
    return (
      <span {...rest} className={cx("sp-root", classNames?.root, className)} style={sized} data-variant={variant}>
        {status}
      </span>
    );
  }

  return (
    <div
      {...rest}
      className={cx("sp-container", classNames?.root, className)}
      style={sized}
      aria-busy={visible || undefined}
      data-loading={visible || undefined}
    >
      <div className={cx("sp-content", classNames?.content)} inert={visible}>
        {children}
      </div>
      {visible && <div className={cx("sp-overlay", classNames?.overlay)}>{status}</div>}
    </div>
  );
}
