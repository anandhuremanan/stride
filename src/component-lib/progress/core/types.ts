export type ProgressVariant = "accent" | "success" | "warning" | "danger";

export type ProgressSize = "sm" | "md" | "lg";

export interface ProgressState {
  /** The task is running but its length is unknown. */
  indeterminate: boolean;
  /** Clamped into range, or null when indeterminate. */
  value: number | null;
  /** 0 to 1, for drawing. */
  fraction: number;
  /** 0 to 100, rounded, for reading. */
  percent: number;
}

export interface ProgressLocaleText {
  /** The accessible name when none is given. */
  label: string;
  /** What a screen reader reads instead of the raw number. */
  valueText(percent: number): string;
  /** Announced while the length is unknown. */
  working: string;
}
