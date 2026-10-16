import type { MouseEventHandler, ReactNode } from "react";

export type BreadcrumbSlot = "root" | "list" | "item" | "link" | "current" | "separator" | "ellipsis";

/** Handed to `renderLink`, to draw a crumb with your router's link component. */
export interface BreadcrumbLinkProps {
  href: string;
  className: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
