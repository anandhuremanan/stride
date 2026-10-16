import type { ButtonState, ButtonStateInput } from "./types";

/** An async click handler's return value: anything with a `then`. */
export function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** How a button behaves for its combination of flags. */
export function buttonState({ disabled = false, loading = false, pending = false }: ButtonStateInput): ButtonState {
  const busy = !disabled && (loading || pending);
  return { busy, inactive: disabled || busy, nativeDisabled: disabled };
}
