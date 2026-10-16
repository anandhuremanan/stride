"use client";

import { useLayoutEffect, useRef, type ReactNode, type ToggleEvent } from "react";
import { cx } from "../core/cx";
import { placePopover, type Align, type Side } from "../core/position";

/** Space kept between the popover and the edge of the viewport. */
const EDGE = 8;

export interface AnchoredPopoverProps {
  /** The element the popover is positioned against. */
  anchor: HTMLElement;
  /** Called when the browser light-dismisses it, or Escape closes it. */
  onClose(): void;
  children: ReactNode;
  id?: string;
  className?: string;
  /**
   * Gives the popover `role="dialog"` and this accessible name. Leave it and
   * `labelledBy` out for content that carries its own role, such as a listbox.
   */
  label?: string;
  /** Names the popover from an element inside it, such as its heading. */
  labelledBy?: string;
  /** Points at a description inside the popover. */
  describedBy?: string;
  /** `menu` for a list of commands, `tooltip` for a label; otherwise a dialog. */
  role?: "dialog" | "menu" | "tooltip";
  /** The side of the anchor to open on, before flipping. Default `bottom`. */
  side?: Side;
  /** Which edge of the anchor to align to, in reading order. Default `start`. */
  align?: Align;
  /** Distance between the anchor and the popover. Default 4. */
  gap?: number;
  /** Make the popover at least as wide as its anchor. */
  matchAnchorWidth?: boolean;
  /**
   * Cap the height to the free space on the chosen side, and prefer the side
   * with more room. For scrolling content such as a long list; panels that
   * cannot scroll should leave it off so they only flip when they fully fit.
   */
  fitHeight?: boolean;
  /** Floor for `fitHeight`, so a cramped viewport still shows something. Default 140. */
  minHeight?: number;
  /**
   * Where focus goes when it opens: a selector, `true` for the first
   * `[data-autofocus]` and otherwise the popover itself, or `false` to leave
   * focus where it is. A popover focused this way needs `tabIndex={-1}`.
   */
  autoFocus?: string | boolean;
  /** Reposition when the popover resizes (`self`) or the anchor does too (`both`). */
  observeResize?: "self" | "both" | false;
  /** Put focus back on the anchor when the popover closes. */
  returnFocus?: boolean;
  /**
   * `auto` (the default) gets the browser's light dismiss and Escape, and is
   * right for anything opened deliberately. `manual` opts out of both, for
   * content that appears beside something else and must not close it: opening
   * an `auto` popover closes every other one, so a tooltip or a submenu over an
   * open menu would take the menu down with it. Manual popovers handle their
   * own dismissal.
   */
  mode?: "auto" | "manual";
}

/**
 * Anchored popover on the native Popover API: rendered in the top layer, so it
 * is never clipped by a scrolling parent or an `overflow: hidden` ancestor, and
 * the browser provides light dismiss and Escape. Mount it to open, unmount it
 * to close.
 *
 * Positioning is deliberately plain — align, clamp to the viewport, flip when
 * there is no room below — because that is all any of the components need, and
 * it keeps the library free of a positioning dependency.
 */
export function AnchoredPopover({
  anchor,
  onClose,
  children,
  id,
  className,
  label,
  labelledBy,
  describedBy,
  role,
  side = "bottom",
  align = "start",
  gap = 4,
  matchAnchorWidth = false,
  fitHeight = false,
  minHeight = 140,
  autoFocus = "[data-autofocus]",
  observeResize = false,
  returnFocus = false,
  mode = "auto",
}: AnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const position = () => {
      const rect = anchor.getBoundingClientRect();
      if (matchAnchorWidth) el.style.minWidth = `${rect.width}px`;

      const placement = placePopover(
        rect,
        { width: el.offsetWidth, height: el.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        {
          side,
          align,
          gap,
          edge: EDGE,
          rtl: getComputedStyle(anchor).direction === "rtl",
          fitHeight,
          minHeight,
        },
      );

      el.style.left = `${placement.left}px`;
      el.style.top = `${placement.top}px`;
      if (placement.maxHeight !== undefined) el.style.maxHeight = `${placement.maxHeight}px`;
      // Lets a stylesheet point an arrow, or slide the panel in from the right
      // direction, without measuring anything itself.
      el.dataset.side = placement.side;
    };

    el.showPopover();
    position();
    // A popover is display:none until it is shown, so focus only lands after
    // showPopover().
    if (autoFocus) {
      const selector = typeof autoFocus === "string" ? autoFocus : "[data-autofocus]";
      const target = el.querySelector<HTMLElement>(selector) ?? (autoFocus === true ? el : null);
      target?.focus({ preventScroll: true });
    }

    const observer = observeResize ? new ResizeObserver(position) : null;
    observer?.observe(el);
    if (observeResize === "both") observer?.observe(anchor);
    window.addEventListener("resize", position);
    // Capture: a scroll in any ancestor moves the anchor, not just the page.
    window.addEventListener("scroll", position, true);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      const hadFocus = el.contains(document.activeElement);
      if (el.matches(":popover-open")) el.hidePopover();
      if (returnFocus && (hadFocus || document.activeElement === document.body) && anchor.isConnected) {
        anchor.focus({ preventScroll: true });
      }
    };
  }, [
    anchor,
    side,
    align,
    gap,
    matchAnchorWidth,
    fitHeight,
    minHeight,
    autoFocus,
    observeResize,
    returnFocus,
  ]);

  return (
    <div
      ref={ref}
      id={id}
      popover={mode}
      // Focusable only from script, so `autoFocus` can land on the panel itself.
      tabIndex={-1}
      role={role ?? (label || labelledBy ? "dialog" : undefined)}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cx(className)}
      onToggle={(event: ToggleEvent<HTMLDivElement>) => {
        if (event.newState === "closed") onClose();
      }}
    >
      {children}
    </div>
  );
}
