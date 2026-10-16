"use client";

import type { ReactNode } from "react";
import { AnchoredPopover } from "../../shared/react/Popover";
import { cx } from "./props";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  children: ReactNode;
  className?: string;
  /** Distance between the anchor and the popover. */
  gap?: number;
}

/**
 * The listbox popover: as wide as the control, capped to the space available so
 * the list scrolls rather than running off screen, and following both elements
 * as the list filters and the control's tags wrap.
 *
 * No `label`, because the listbox inside carries its own role and name.
 */
export function ComboboxPopover({ anchor, onClose, children, className, gap = 4 }: PopoverProps) {
  return (
    <AnchoredPopover
      anchor={anchor}
      onClose={onClose}
      className={cx("cb-popover", className)}
      gap={gap}
      matchAnchorWidth
      fitHeight
      autoFocus="[data-autofocus], input, [tabindex]"
      observeResize="both"
    >
      {children}
    </AnchoredPopover>
  );
}
