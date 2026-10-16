import type { ReactNode } from "react";

export interface BreadcrumbItem {
  label: ReactNode;
  /** Omit for the current page or a crumb that isn't a link. */
  href?: string;
  icon?: ReactNode;
  /** Plain-text name, for structured data when `label` isn't a string. */
  name?: string;
  /** Called on click, e.g. for client-side navigation without an href. */
  onClick?(): void;
}

/** One position in the rendered trail. */
export type CrumbSlot = { kind: "item"; index: number } | { kind: "ellipsis"; hidden: number[] };

export interface BreadcrumbLocaleText {
  label: string;
  showMore(count: string): string;
}
