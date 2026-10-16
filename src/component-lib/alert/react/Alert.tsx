"use client";

import {
  useMemo,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { liveness } from "../core/live";
import type { AlertLocaleText, AlertSize, AlertVariant } from "../core/types";
import { VARIANT_ICONS, XIcon } from "./icons";
import { defaultAlertText } from "./locale";
import { cx, type AlertSlot } from "./props";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "role"> {
  /** Default `info`. */
  variant?: AlertVariant;
  /** Default `md`. `sm` drops the title to one line of text. */
  size?: AlertSize;
  title?: ReactNode;
  /** The message. `children` works too, and is the better place for links. */
  description?: ReactNode;
  children?: ReactNode;
  /** Replace the variant's glyph, or pass `false` for none. */
  icon?: ReactNode | false;
  /** Buttons under the message: "Try again", "Go to billing". */
  actions?: ReactNode;
  /** Show a close button. The alert does not hide itself; remove it in the handler. */
  onDismiss?(): void;
  className?: string;
  classNames?: Partial<Record<AlertSlot, string>>;
  style?: CSSProperties;
  localeText?: Partial<AlertLocaleText>;
  ref?: Ref<HTMLDivElement>;
}

/**
 * A message that stays in the page: a trial ending, a read-only record, the
 * summary above a form that failed validation.
 *
 * It is the third of three ways to say something, and the only one that is
 * neither interrupting nor temporary. Use a **Dialog** when the message needs a
 * decision before anything else can happen, a **Toast** to confirm something
 * that has already happened, and an Alert for the state a page or section is
 * in.
 */
export function Alert(props: AlertProps) {
  const {
    ref,
    variant = "info",
    size = "md",
    title,
    description,
    children,
    icon,
    actions,
    onDismiss,
    className,
    classNames,
    style,
    localeText,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultAlertText, ...localeText }), [localeText]);
  const { role, live } = liveness(variant);
  const Glyph = VARIANT_ICONS[variant];

  return (
    <div
      {...rest}
      ref={ref}
      // Only what appears after the page has loaded is announced; a banner that
      // was there from the start is read in its turn, like any other text.
      role={role}
      aria-live={live}
      className={cx("al-root", classNames?.root, className)}
      style={style}
      data-variant={variant}
      data-size={size}
    >
      {icon !== false && (
        <span className={cx("al-icon", classNames?.icon)} aria-hidden="true">
          {icon ?? <Glyph />}
        </span>
      )}

      <div className={cx("al-content", classNames?.content)}>
        {title && <p className={cx("al-title", classNames?.title)}>{title}</p>}
        {(description || children) && (
          <div className={cx("al-description", classNames?.description)}>
            {description}
            {children}
          </div>
        )}
        {actions && <div className={cx("al-actions", classNames?.actions)}>{actions}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          className={cx("al-dismiss", classNames?.dismiss)}
          aria-label={text.dismiss}
          title={text.dismiss}
          onClick={onDismiss}
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}
