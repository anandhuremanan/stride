"use client";

import type { HTMLAttributes, ReactNode, Ref } from "react";
import { formatCount, showCount } from "../core/count";
import type { BadgeAppearance, BadgeSize, BadgeVariant } from "../core/types";
import { cx, type BadgeSlot } from "./props";

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  children?: ReactNode;
  /** Default `neutral`. */
  variant?: BadgeVariant;
  /** Default `soft`. */
  appearance?: BadgeAppearance;
  /** Default `md`. */
  size?: BadgeSize;
  /** A number instead of children. Above `max` it reads "99+". */
  count?: number;
  /** Where the count stops. Default 99. */
  max?: number;
  /** Show a count of zero. Default false: an empty counter is noise. */
  showZero?: boolean;
  /** Format the number, e.g. with `Intl.NumberFormat`. */
  formatValue?(value: number): string;
  /** A small filled circle before the label, for a status. */
  dot?: boolean;
  /** An icon before the label, in place of `dot`. */
  icon?: ReactNode;
  classNames?: Partial<Record<BadgeSlot, string>>;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A short, static label: a status, a category, a count.
 *
 * It is text, not a control — nothing here is clickable or removable. Use
 * **Tag** for something the user can take off, and a **Button** for something
 * they can press.
 */
export function Badge(props: BadgeProps) {
  const {
    ref,
    children,
    variant = "neutral",
    appearance = "soft",
    size = "md",
    count,
    max = 99,
    showZero = false,
    formatValue,
    dot = false,
    icon,
    className,
    classNames,
    ...rest
  } = props;

  const counted = count !== undefined;
  if (counted && !showCount(count, showZero)) return null;
  const label = counted ? formatCount(count, max, formatValue) : null;

  return (
    <span
      {...rest}
      ref={ref}
      className={cx("bd-root", classNames?.root, className)}
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      data-count={counted || undefined}
    >
      {dot && <span className={cx("bd-dot", classNames?.dot)} aria-hidden="true" />}
      {icon && (
        <span className={cx("bd-icon", classNames?.icon)} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={cx("bd-label", classNames?.label)}>
        {label ? (
          <>
            <span aria-hidden={label.spoken ? "true" : undefined}>{label.text}</span>
            {/* "99+" read aloud is a guess at a number; this says what it means. */}
            {label.spoken && <span className="bd-sr-only">{label.spoken}</span>}
          </>
        ) : (
          children
        )}
      </span>
    </span>
  );
}
