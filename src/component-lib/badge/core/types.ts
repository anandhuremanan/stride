export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/** `soft` is a tint, `solid` a filled block, `outline` a border only. */
export type BadgeAppearance = "soft" | "solid" | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeLocaleText {
  /** The remove button on a Tag. `label` is the tag's own text. */
  remove(label: string): string;
}
