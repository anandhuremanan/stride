export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonStateInput {
  disabled?: boolean;
  /** Set by you. */
  loading?: boolean;
  /** Set by the button itself: an async `onClick` or a pending form action. */
  pending?: boolean;
}

export interface ButtonState {
  /** Show the spinner and `aria-busy`. */
  busy: boolean;
  /** Ignore activation. */
  inactive: boolean;
  /**
   * Use the native `disabled` attribute. A busy button stays focusable and uses
   * `aria-disabled` instead, so keyboard focus isn't thrown away mid-action.
   */
  nativeDisabled: boolean;
}

export interface ButtonLocaleText {
  /** Announced while the button is busy. */
  loading: string;
}
