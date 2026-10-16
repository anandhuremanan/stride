export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/** `center` and `top` are dialogs; `left`, `right` and `bottom` slide in as drawers. */
export type ModalPlacement = "center" | "top" | "left" | "right" | "bottom";

/** What asked the modal to close. */
export type CloseReason = "escape" | "backdrop" | "close-button" | "api";

export interface DismissOptions {
  /** Default true. */
  closeOnEscape?: boolean;
  /** Default true. */
  closeOnBackdrop?: boolean;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type CloseGuard = (reason: CloseReason) => boolean | Promise<boolean>;

export interface ModalLocaleText {
  close: string;
}
