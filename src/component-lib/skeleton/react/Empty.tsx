"use client";

import type { CSSProperties, ReactNode } from "react";
import type { EmptySlot } from "../core/types";
import { cx } from "./props";

export interface EmptyProps {
  /** What is missing, in a few words. */
  title: ReactNode;
  /** Why it is empty, and what to do about it. */
  description?: ReactNode;
  /** Decorative: an illustration or icon above the title. */
  icon?: ReactNode;
  /** The way out — usually one button, occasionally two. */
  actions?: ReactNode;
  /** Default `md`. `sm` suits an empty panel inside a page. */
  size?: "sm" | "md" | "lg";
  className?: string;
  classNames?: Partial<Record<EmptySlot, string>>;
  style?: CSSProperties;
}

/**
 * The state a list, table or panel shows when there is nothing in it.
 *
 * It is a normal region rather than a live one: an empty result is part of the
 * page, not an alert, and a search that returns nothing should not interrupt
 * what someone is reading. Say what is missing and offer the way out.
 */
export function Empty(props: EmptyProps) {
  const { title, description, icon, actions, size = "md", className, classNames, style } = props;

  return (
    <div
      className={cx("em-root", classNames?.root, className)}
      style={style}
      data-size={size}
    >
      {icon && (
        <div className={cx("em-icon", classNames?.icon)} aria-hidden="true">
          {icon}
        </div>
      )}
      <p className={cx("em-title", classNames?.title)}>{title}</p>
      {description && (
        <p className={cx("em-description", classNames?.description)}>{description}</p>
      )}
      {actions && <div className={cx("em-actions", classNames?.actions)}>{actions}</div>}
    </div>
  );
}
