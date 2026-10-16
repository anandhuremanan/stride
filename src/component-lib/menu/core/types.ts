import type { ReactNode } from "react";

export type MenuSide = "top" | "bottom" | "left" | "right";
export type MenuAlign = "start" | "end";

/** What closed the menu, so callers can tell a choice from a dismissal. */
export type MenuCloseReason = "escape" | "outside" | "trigger" | "select" | "api";

export type MenuSlot =
  | "root"
  | "list"
  | "item"
  | "icon"
  | "label"
  | "shortcut"
  | "separator"
  | "group"
  | "groupLabel"
  | "indicator"
  | "submenu";

export interface MenuLocaleText {
  /** Fallback name for a menu with no label. */
  label: string;
  /** Announced on a submenu trigger. */
  submenu(label: string): string;
}

/** A shortcut shown beside an item. Purely a hint: the menu does not bind keys. */
export interface MenuShortcut {
  keys: ReactNode;
}
