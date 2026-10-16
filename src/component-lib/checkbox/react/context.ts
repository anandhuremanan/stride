"use client";

import { createContext } from "react";
import type { CheckboxSize } from "../core/types";

export interface CheckboxGroupContextValue {
  values: readonly string[];
  toggle(value: string, checked: boolean): void;
  name?: string;
  disabled: boolean;
  invalid: boolean;
  size?: CheckboxSize;
}

/** Lets each Checkbox inside a CheckboxGroup read and change the group's values. */
export const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);
