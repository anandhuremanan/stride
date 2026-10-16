"use client";

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { XIcon } from "../../shared/react/icons";
import type { BadgeAppearance, BadgeLocaleText, BadgeSize, BadgeVariant } from "../core/types";
import { defaultBadgeText } from "./locale";
import { cx, type TagSlot } from "./props";

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onRemove"> {
  children?: ReactNode;
  variant?: BadgeVariant;
  appearance?: BadgeAppearance;
  size?: BadgeSize;
  /** An icon before the label. */
  icon?: ReactNode;
  /** Show a remove button. Without it a Tag is a Badge with a bit more padding. */
  onRemove?(): void;
  /** Names the remove button when the tag's own text is not a plain string. */
  label?: string;
  disabled?: boolean;
  classNames?: Partial<Record<TagSlot, string>>;
  localeText?: Partial<BadgeLocaleText>;
  ref?: Ref<HTMLSpanElement>;
}

/**
 * A chip the user can take off: a filter, a recipient, a selected value.
 *
 * The remove button carries the tag's own text in its name, so a screen reader
 * says "Remove Berlin" rather than announcing a row of identical "Remove"
 * buttons with no way to tell them apart.
 */
export function Tag(props: TagProps) {
  const {
    ref,
    children,
    variant = "neutral",
    appearance = "soft",
    size = "md",
    icon,
    onRemove,
    label,
    disabled = false,
    className,
    classNames,
    localeText,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultBadgeText, ...localeText }), [localeText]);
  const name = label ?? (typeof children === "string" ? children : "");

  return (
    <span
      {...rest}
      ref={ref}
      className={cx("bd-tag", classNames?.root, className)}
      data-variant={variant}
      data-appearance={appearance}
      data-size={size}
      data-disabled={disabled || undefined}
    >
      {icon && (
        <span className={cx("bd-icon", classNames?.icon)} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={cx("bd-label", classNames?.label)}>{children}</span>
      {onRemove && (
        <button
          type="button"
          className={cx("bd-remove", classNames?.remove)}
          aria-label={text.remove(name)}
          title={text.remove(name)}
          disabled={disabled}
          onClick={onRemove}
        >
          <XIcon width={12} height={12} />
        </button>
      )}
    </span>
  );
}
