"use client";

import type { AnchorHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";
import type { CardPadding, CardSlot, CardVariant } from "../core/types";
import { cx } from "./props";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children?: ReactNode;
  /** Default `outlined`. */
  variant?: CardVariant;
  /** Padding applied to the header, body and footer. Default `md`. */
  padding?: CardPadding;
  /**
   * Makes the whole card a link. The card becomes an `<a>`, so keep any other
   * interactive content out of it — nested links and buttons are not valid.
   */
  href?: string;
  /** Passed through when `href` is set. */
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  /**
   * Passed through when `href` is set. Worth setting to
   * `noopener noreferrer` on any card linking off-site.
   */
  rel?: string;
  /** Lifts the card on hover, for a card that is clickable by other means. */
  interactive?: boolean;
  className?: string;
  classNames?: Partial<Record<CardSlot, string>>;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
}

/**
 * A surface that groups related content, with optional header, body and footer.
 *
 * Give it a heading through `CardHeader` rather than a bare `title` prop, so the
 * page decides the heading level: a card is not always at the same depth.
 */
export function Card(props: CardProps) {
  const {
    ref,
    children,
    variant = "outlined",
    padding = "md",
    href,
    target,
    rel,
    interactive = false,
    className,
    classNames,
    style,
    ...rest
  } = props;

  const shared = {
    className: cx("cd-root", classNames?.root, className),
    style,
    "data-variant": variant,
    "data-padding": padding,
    "data-interactive": (interactive || href !== undefined) || undefined,
    ...rest,
  };

  if (href !== undefined) {
    return (
      <a
        {...shared}
        ref={ref as Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        // Anything opening a new tab gets the safe default unless told otherwise.
        rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
      >
        {children}
      </a>
    );
  }

  return (
    <div {...shared} ref={ref as Ref<HTMLDivElement>}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  /** The heading. Wrap it in your own `h2`/`h3` to set the level. */
  title?: ReactNode;
  /** A line under the heading, for context the title cannot carry. */
  description?: ReactNode;
  /** Buttons or a menu, aligned to the end of the header. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  classNames?: Partial<Record<CardSlot, string>>;
}

export function CardHeader({
  title,
  description,
  actions,
  children,
  className,
  classNames,
}: CardHeaderProps) {
  return (
    <div className={cx("cd-header", classNames?.header, className)}>
      <div className="cd-heading">
        {title && <div className={cx("cd-title", classNames?.title)}>{title}</div>}
        {description && (
          <div className={cx("cd-description", classNames?.description)}>{description}</div>
        )}
        {children}
      </div>
      {actions && <div className={cx("cd-actions", classNames?.actions)}>{actions}</div>}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cx("cd-body", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <div className={cx("cd-footer", className)}>{children}</div>;
}
