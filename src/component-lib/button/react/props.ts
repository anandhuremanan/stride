import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "../core/types";

export type ButtonSlot = "root" | "content" | "spinner" | "icon";

/** Handed to `render`, to put the button's look and behavior on another element. */
export interface ButtonRenderProps {
  className: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick(event: MouseEvent<HTMLElement>): void;
  "data-variant": ButtonVariant;
  "data-size": ButtonSize;
  "data-busy"?: "";
  "data-icon-only"?: "";
  "data-full-width"?: "";
  "aria-busy"?: boolean;
  "aria-disabled"?: boolean;
  [attribute: string]: unknown;
}

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
