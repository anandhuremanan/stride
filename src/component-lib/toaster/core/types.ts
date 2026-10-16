import type { ReactNode } from "react";

export type ToastType = "default" | "success" | "error" | "warning" | "info" | "loading";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** The click event handed to an action. Call `preventDefault()` to keep the toast open. */
export interface ToastActionEvent {
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

export interface ToastAction {
  label: ReactNode;
  onClick(event: ToastActionEvent): void;
}

export interface ToastRenderProps {
  id: string;
  dismiss(): void;
}

export interface ToastOptions {
  /** Showing a toast with an id that is already on screen updates it in place. */
  id?: string;
  type?: ToastType;
  description?: ReactNode;
  /** Milliseconds before it closes. `0` or `Infinity` keeps it until dismissed. */
  duration?: number;
  /** Close button, Escape and swipe. Default true. */
  dismissible?: boolean;
  action?: ToastAction;
  cancel?: ToastAction;
  /** Replaces the type's icon; `null` hides it. */
  icon?: ReactNode;
  className?: string;
  /** Renders the whole toast body yourself. */
  render?(props: ToastRenderProps): ReactNode;
  /** Closed by the user or by code. */
  onDismiss?(toast: ToastRecord): void;
  /** Closed because its time ran out. */
  onAutoClose?(toast: ToastRecord): void;
}

export interface ToastRecord
  extends Omit<ToastOptions, "id" | "type" | "duration" | "dismissible"> {
  id: string;
  type: ToastType;
  title: ReactNode;
  /** Always a positive number; `Infinity` when it stays until dismissed. */
  duration: number;
  dismissible: boolean;
  /** `closing` while the exit animation plays, just before removal. */
  state: "open" | "closing";
  createdAt: number;
  /** Goes up each time the same id is shown or updated. */
  version: number;
}

export interface ToastSnapshot {
  /** Newest first, including toasts waiting beyond `limit`. */
  toasts: readonly ToastRecord[];
  /** Timers are held, e.g. while the pointer is over the toasts. */
  paused: boolean;
  /** How many open toasts are on screen at once. */
  limit: number;
}

export interface ToasterLocaleText {
  regionLabel(hotkey: string): string;
  close: string;
}
