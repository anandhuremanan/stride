"use client";

import type { ReactNode } from "react";
import { AnchoredPopover } from "../../shared/react/Popover";
import { cx } from "./props";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  label: string;
  id: string;
  /** Move focus into the calendar when it opens. False while someone is typing. */
  autoFocus?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The calendar panel. It repositions as the panel changes height between the
 * day, month and year views, and it keeps its size rather than scrolling, so it
 * only moves above the field when the whole panel fits there.
 */
export function DatePickerPopover({
  anchor,
  onClose,
  label,
  id,
  autoFocus = true,
  className,
  children,
}: PopoverProps) {
  return (
    <AnchoredPopover
      anchor={anchor}
      onClose={onClose}
      label={label}
      id={id}
      className={cx("dp-popover", className)}
      autoFocus={autoFocus && "[data-autofocus]"}
      observeResize="self"
    >
      {children}
    </AnchoredPopover>
  );
}
