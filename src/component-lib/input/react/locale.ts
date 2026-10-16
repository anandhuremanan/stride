import type { InputLocaleText } from "../core/types";

export const defaultInputText: InputLocaleText = {
  clear: "Clear",
  showPassword: "Show password",
  hidePassword: "Hide password",
  characterCount: (count, max) => (max === undefined ? count : `${count} / ${max}`),
  otpLabel: "Verification code",
};
