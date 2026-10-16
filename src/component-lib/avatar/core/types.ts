export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export type AvatarShape = "circle" | "square";

/** Who is on the other side of a presence dot. */
export type AvatarStatus = "online" | "away" | "busy" | "offline";

export interface AvatarLocaleText {
  /** The overflow bubble in a group. */
  more(count: number): string;
  status: Record<AvatarStatus, string>;
}
