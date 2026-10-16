"use client";

import { createContext, use } from "react";
import type { TabsActivation, TabsOrientation } from "../core/types";

export interface TabsContextValue {
  id: string;
  value: string | undefined;
  select(value: string): void;
  orientation: TabsOrientation;
  activation: TabsActivation;
  keepMounted: boolean;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const context = use(TabsContext);
  if (!context) throw new Error("TabList, Tab and TabPanel must be used inside <Tabs>.");
  return context;
}
