"use client";

import { createContext, use } from "react";
import type { MenuCloseReason, MenuSlot } from "../core/types";

export interface MenuContextValue {
  /** Closes this menu and, for a submenu, everything above it. */
  close(reason: MenuCloseReason): void;
  /** Close the whole stack after a choice. False keeps it open, e.g. for checkboxes. */
  closeOnSelect: boolean;
  classNames?: Partial<Record<MenuSlot, string>>;
  /** Depth, so a submenu knows it has a parent to hand focus back to. */
  depth: number;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

export function useMenuContext(component: string): MenuContextValue {
  const context = use(MenuContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside a <Menu>.`);
  }
  return context;
}

export interface RadioGroupContextValue {
  value: string | undefined;
  select(value: string): void;
}

export const MenuRadioContext = createContext<RadioGroupContextValue | null>(null);
