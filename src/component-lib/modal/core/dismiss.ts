import type { CloseGuard, CloseReason, DismissOptions, Rect } from "./types";

/** Whether a close request is allowed before asking `onBeforeClose`. Code and the close button always are. */
export function canDismiss(reason: CloseReason, options: DismissOptions = {}): boolean {
  if (reason === "escape") return options.closeOnEscape ?? true;
  if (reason === "backdrop") return options.closeOnBackdrop ?? true;
  return true;
}

/**
 * A native `<dialog>` reports clicks on its backdrop as clicks on itself, so a
 * click counts as "on the backdrop" when it lands outside the dialog's box.
 */
export function isOutside(rect: Rect, x: number, y: number): boolean {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

/**
 * Runs `onBeforeClose`. Only an explicit `false` (or a promise of it) keeps the
 * modal open; a guard that throws keeps it open too, so unsaved work isn't lost.
 */
export async function confirmClose(guard: CloseGuard | undefined, reason: CloseReason): Promise<boolean> {
  if (!guard) return true;
  try {
    return (await guard(reason)) !== false;
  } catch {
    return false;
  }
}
