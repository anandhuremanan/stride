export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export type SpinnerVariant = "ring" | "dots";

export interface VisibilityOptions {
  /** Wait this long before showing, so fast work never flashes a spinner. Default 0. */
  delay?: number;
  /** Once shown, stay at least this long, so it doesn't blink off. Default 0. */
  minDuration?: number;
}

export interface VisibilityMarks {
  visible: boolean;
  /** When `loading` last turned true, or null while not loading. */
  loadingSince: number | null;
  /** When the spinner last appeared, or null while hidden. */
  visibleSince: number | null;
}

export interface VisibilityStep {
  visible: boolean;
  /** Milliseconds until the answer can change, or null when it won't on its own. */
  recheckIn: number | null;
}

export interface SpinnerLocaleText {
  loading: string;
}
