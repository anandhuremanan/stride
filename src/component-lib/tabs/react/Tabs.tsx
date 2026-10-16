"use client";

import {
  Activity,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useControllableState } from "../../shared/react/useControllableState";
import { cx } from "../../shared/core/cx";
import { nextTab, tabDomId } from "../core/navigation";
import type {
  TabsActivation,
  TabsOrientation,
  TabsSize,
  TabsVariant,
} from "../core/types";
import { TabsContext, useTabsContext } from "./context";

/* ------------------------------------------------------------------- Tabs */

export interface TabsProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  /** Selected tab (controlled). */
  value?: string;
  /** Selected tab at first. Without either, the first enabled tab is selected. */
  defaultValue?: string;
  /** The newly selected tab. Not fired when the same tab is clicked again. */
  onValueChange?(value: string): void;
  /** Default `horizontal`. */
  orientation?: TabsOrientation;
  /** Default `automatic`: arrow keys select as they move. */
  activation?: TabsActivation;
  /** Default `line`. */
  variant?: TabsVariant;
  /** Default `md`. */
  size?: TabsSize;
  /**
   * Keep hidden panels mounted, preserving their state (form input, scroll) at
   * lower rendering priority through React's `<Activity>`. Default false.
   */
  keepMounted?: boolean;
  children?: ReactNode;
}

/** Tabs following the WAI-ARIA pattern. Compose with `TabList`, `Tab` and `TabPanel`. */
export function Tabs(props: TabsProps) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    orientation = "horizontal",
    activation = "automatic",
    variant = "line",
    size = "md",
    keepMounted = false,
    className,
    children,
    ...rest
  } = props;

  const id = useId();
  const [value, setValue] = useControllableState(valueProp, defaultValue);

  const select = useCallback(
    (next: string) => {
      setValue(next);
      if (next !== value) onValueChange?.(next);
    },
    [setValue, value, onValueChange],
  );

  const context = useMemo(
    () => ({ id, value, select, orientation, activation, keepMounted }),
    [id, value, select, orientation, activation, keepMounted],
  );

  return (
    <TabsContext value={context}>
      <div
        {...rest}
        className={cx("tb-root", className)}
        data-orientation={orientation}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </div>
    </TabsContext>
  );
}

/* ---------------------------------------------------------------- TabList */

export type TabListProps = HTMLAttributes<HTMLDivElement>;

export function TabList(props: TabListProps) {
  const { className, children, onKeyDown, ...rest } = props;
  const context = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  /** Tabs belonging to this list, in document order (not nested tab lists). */
  const getTabs = useCallback(() => {
    const list = listRef.current;
    if (!list) return [];
    return Array.from(
      list.querySelectorAll<HTMLElement>('[role="tab"]'),
    ).filter((tab) => tab.closest('[role="tablist"]') === list);
  }, []);

  // Without a matching value, select the first enabled tab so the list stays reachable by Tab.
  useLayoutEffect(() => {
    const tabs = getTabs();
    if (tabs.some((tab) => tab.dataset.value === context.value)) return;
    const first = tabs.find(
      (tab) => tab.getAttribute("aria-disabled") !== "true",
    );
    if (first?.dataset.value !== undefined) context.select(first.dataset.value);
  }, [context, getTabs]);

  // Slide the indicator under the selected tab, and follow size changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const horizontal = context.orientation === "horizontal";
    const place = () => {
      const active = getTabs().find(
        (tab) => tab.getAttribute("aria-selected") === "true",
      );
      if (!active) {
        list.style.removeProperty("--tb-indicator-size");
        return;
      }
      list.style.setProperty(
        "--tb-indicator-start",
        `${horizontal ? active.offsetLeft : active.offsetTop}px`,
      );
      list.style.setProperty(
        "--tb-indicator-size",
        `${horizontal ? active.offsetWidth : active.offsetHeight}px`,
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    for (const tab of getTabs()) observer.observe(tab);
    return () => observer.disconnect();
  }, [context.value, context.orientation, getTabs]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tabs = getTabs();
    const current = tabs.indexOf(document.activeElement as HTMLElement);
    if (current === -1) return;

    if (
      context.activation === "manual" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      const value = tabs[current].dataset.value;
      if (
        value !== undefined &&
        tabs[current].getAttribute("aria-disabled") !== "true"
      )
        context.select(value);
      return;
    }

    const next = nextTab(
      tabs.map((tab) => ({
        disabled: tab.getAttribute("aria-disabled") === "true",
      })),
      current,
      event.key,
      {
        orientation: context.orientation,
        rtl: getComputedStyle(event.currentTarget).direction === "rtl",
      },
    );
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    target.focus();
    if (
      context.activation === "automatic" &&
      target.dataset.value !== undefined
    ) {
      context.select(target.dataset.value);
    }
  };

  return (
    <div
      {...rest}
      ref={listRef}
      role="tablist"
      aria-orientation={context.orientation}
      className={cx("tb-list", className)}
      onKeyDown={handleKeyDown}
    >
      {children}
      <span className="tb-indicator" aria-hidden="true" />
    </div>
  );
}

/* -------------------------------------------------------------------- Tab */

export interface TabProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "type"
> {
  /** Identifies the tab and its panel. */
  value: string;
  /** An icon before the tab's text. */
  icon?: ReactNode;
  /** A small count or label after the text, e.g. unread items. */
  badge?: ReactNode;
}

export function Tab(props: TabProps) {
  const {
    value,
    icon,
    badge,
    disabled = false,
    className,
    children,
    onClick,
    ...rest
  } = props;
  const context = useTabsContext();
  const selected = context.value === value;

  return (
    <button
      {...rest}
      type="button"
      role="tab"
      id={tabDomId(context.id, "tab", value)}
      aria-controls={tabDomId(context.id, "panel", value)}
      aria-selected={selected}
      // aria-disabled keeps the tab discoverable; arrow keys skip it.
      aria-disabled={disabled || undefined}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      className={cx("tb-tab", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!disabled && !event.defaultPrevented) context.select(value);
      }}
    >
      {icon && (
        <span className="tb-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="tb-label">{children}</span>
      {badge !== undefined && badge !== null && (
        <span className="tb-badge">{badge}</span>
      )}
    </button>
  );
}

/* --------------------------------------------------------------- TabPanel */

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  /** Overrides `keepMounted` on `Tabs` for this panel. */
  keepMounted?: boolean;
}

export function TabPanel(props: TabPanelProps) {
  const { value, keepMounted, className, children, ...rest } = props;
  const context = useTabsContext();
  const selected = context.value === value;
  const keep = keepMounted ?? context.keepMounted;

  return (
    <div
      {...rest}
      role="tabpanel"
      id={tabDomId(context.id, "panel", value)}
      aria-labelledby={tabDomId(context.id, "tab", value)}
      // Focusable so keyboard users reach panels without focusable content.
      tabIndex={0}
      hidden={!selected}
      className={cx("tb-panel", className)}
    >
      {keep ? (
        <Activity mode={selected ? "visible" : "hidden"}>{children}</Activity>
      ) : selected ? (
        children
      ) : null}
    </div>
  );
}
