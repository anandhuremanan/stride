export type TabsOrientation = "horizontal" | "vertical";

/** `automatic` selects a tab as soon as it gets focus; `manual` waits for Enter or Space. */
export type TabsActivation = "automatic" | "manual";

export type TabsVariant = "line" | "pills" | "enclosed";

export type TabsSize = "sm" | "md" | "lg";

export interface NavigationOptions {
  orientation?: TabsOrientation;
  /** Right-to-left: the horizontal arrow keys swap. */
  rtl?: boolean;
  /** Wrap from the last tab to the first. Default true. */
  loop?: boolean;
}
