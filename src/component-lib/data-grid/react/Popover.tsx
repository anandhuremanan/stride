"use client";

import type { ReactNode } from "react";
import { AnchoredPopover } from "../../shared/react/Popover";
import { cx } from "./context";

interface PopoverProps {
  anchor: HTMLElement;
  onClose(): void;
  label: string;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
}

/**
 * The grid's column and toolbar menus. Focus returns to the header button or
 * toolbar control that opened it, so keyboard work carries on where it left off
 * instead of restarting at the top of the page.
 */
export function Popover({ anchor, onClose, label, align = "start", className, children }: PopoverProps) {
  return (
    <AnchoredPopover
      anchor={anchor}
      onClose={onClose}
      label={label}
      align={align}
      className={cx("dg-popover", className)}
      autoFocus="[data-autofocus], button, input, select, textarea"
      returnFocus
    >
      {children}
    </AnchoredPopover>
  );
}
