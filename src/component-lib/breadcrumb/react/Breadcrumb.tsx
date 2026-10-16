"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { collapseItems, toBreadcrumbJsonLd } from "../core/trail";
import type { BreadcrumbItem, BreadcrumbLocaleText } from "../core/types";
import { defaultBreadcrumbText } from "./locale";
import { cx, type BreadcrumbLinkProps, type BreadcrumbSlot } from "./props";

export interface BreadcrumbProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** From the top level to the current page. The last item is the current page. */
  items: readonly BreadcrumbItem[];
  /** Between crumbs. Default a chevron. */
  separator?: ReactNode;
  /** Collapse the middle of the trail when it has more crumbs than this. */
  maxItems?: number;
  /** Crumbs kept before the collapsed part. Default 1. */
  itemsBeforeCollapse?: number;
  /** Crumbs kept after the collapsed part. Default 1. */
  itemsAfterCollapse?: number;
  /** Draw links with your router, e.g. `(props) => <Link {...props} />`. */
  renderLink?(props: BreadcrumbLinkProps): ReactElement;
  /**
   * Add schema.org `BreadcrumbList` JSON-LD for search engines. Pass
   * `{ baseUrl }` so relative links become absolute, as search engines require.
   */
  structuredData?: boolean | { baseUrl: string };
  /** Default `md`. */
  size?: "sm" | "md" | "lg";
  classNames?: Partial<Record<BreadcrumbSlot, string>>;
  localeText?: Partial<BreadcrumbLocaleText>;
}

const Chevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/** Where the current page sits in the site's hierarchy. */
export function Breadcrumb(props: BreadcrumbProps) {
  const {
    items,
    separator,
    maxItems,
    itemsBeforeCollapse = 1,
    itemsAfterCollapse = 1,
    renderLink,
    structuredData = false,
    size = "md",
    className,
    classNames,
    localeText,
    "aria-label": ariaLabel,
    ...rest
  } = props;

  const text = useMemo(() => ({ ...defaultBreadcrumbText, ...localeText }), [localeText]);
  const listRef = useRef<HTMLOListElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [revealFrom, setRevealFrom] = useState<number | null>(null);

  // After expanding, move focus to the first crumb that was hidden, not to <body>.
  useEffect(() => {
    if (revealFrom === null) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${revealFrom}"] :is(a, button, [tabindex])`)?.focus();
  }, [revealFrom]);

  const slots = expanded
    ? collapseItems(items.length)
    : collapseItems(items.length, maxItems, itemsBeforeCollapse, itemsAfterCollapse);
  const lastIndex = items.length - 1;

  const renderItem = (item: BreadcrumbItem, index: number) => {
    const content = (
      <>
        {item.icon && (
          <span className="bc-icon" aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className="bc-text" title={typeof item.label === "string" ? item.label : undefined}>
          {item.label}
        </span>
      </>
    );

    if (index === lastIndex || (!item.href && !item.onClick)) {
      return (
        <span
          className={cx("bc-current", classNames?.current)}
          aria-current={index === lastIndex ? "page" : undefined}
        >
          {content}
        </span>
      );
    }
    if (item.href) {
      const linkProps: BreadcrumbLinkProps = {
        href: item.href,
        className: cx("bc-link", classNames?.link),
        children: content,
        onClick: item.onClick ? () => item.onClick?.() : undefined,
      };
      return renderLink ? renderLink(linkProps) : <a {...linkProps} />;
    }
    return (
      <button type="button" className={cx("bc-link", classNames?.link)} onClick={item.onClick}>
        {content}
      </button>
    );
  };

  const jsonLd = structuredData
    ? toBreadcrumbJsonLd(
        items.map((item) => ({
          name: item.name ?? (typeof item.label === "string" ? item.label : ""),
          href: item.href,
        })),
        typeof structuredData === "object" ? structuredData.baseUrl : undefined,
      )
    : null;

  return (
    <nav
      {...rest}
      aria-label={ariaLabel ?? text.label}
      className={cx("bc-root", classNames?.root, className)}
      data-size={size}
    >
      <ol ref={listRef} className={cx("bc-list", classNames?.list)}>
        {slots.map((slot, position) => (
          <li
            key={slot.kind === "item" ? slot.index : "ellipsis"}
            className={cx("bc-item", classNames?.item)}
            data-index={slot.kind === "item" ? slot.index : undefined}
          >
            {position > 0 && (
              <span className={cx("bc-separator", classNames?.separator)} aria-hidden="true">
                {separator ?? <Chevron />}
              </span>
            )}
            {slot.kind === "item" ? (
              renderItem(items[slot.index], slot.index)
            ) : (
              <button
                type="button"
                className={cx("bc-ellipsis", classNames?.ellipsis)}
                aria-label={text.showMore(String(slot.hidden.length))}
                title={text.showMore(String(slot.hidden.length))}
                onClick={() => {
                  setExpanded(true);
                  setRevealFrom(slot.hidden[0]);
                }}
              >
                …
              </button>
            )}
          </li>
        ))}
      </ol>
      {jsonLd && (
        <script
          type="application/ld+json"
          // `<` is escaped so a crumb's name can never close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
    </nav>
  );
}
