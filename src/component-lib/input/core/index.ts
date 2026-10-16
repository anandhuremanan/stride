// Framework-free: character counting and the OTP rules the components use.
export { countCharacters } from "./count";
export {
  activeCell,
  cellAt,
  otpInputMode,
  otpPattern,
  sanitizeOtp,
  separatorsAfter,
} from "./otp";
export type * from "./types";
