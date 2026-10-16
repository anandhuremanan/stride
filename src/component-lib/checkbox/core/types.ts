import type { ReactNode } from "react";

export type CheckboxSize = "sm" | "md" | "lg";

/** `true`, `false`, or partly checked. */
export type CheckedState = boolean | "indeterminate";

export interface CheckboxOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface CheckboxLocaleText {
  selectAll: string;
}
