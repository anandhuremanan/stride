export type AvatarSlot = "root" | "image" | "fallback" | "status";

export type AvatarGroupSlot = "root" | "overflow";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
