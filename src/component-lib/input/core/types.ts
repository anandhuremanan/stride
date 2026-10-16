export type FieldSize = "sm" | "md" | "lg";

/** Which characters an OTP cell accepts. */
export type OtpMode = "numeric" | "alphanumeric" | "alphabetic";

export interface InputLocaleText {
  clear: string;
  showPassword: string;
  hidePassword: string;
  /** `max` is set when the field has a `maxLength`. */
  characterCount(count: string, max?: string): string;
  /** Accessible name of the code field when no `label` is given. */
  otpLabel: string;
}
