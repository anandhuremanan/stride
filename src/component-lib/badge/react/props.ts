export type BadgeSlot = "root" | "dot" | "icon" | "label";

export type TagSlot = "root" | "icon" | "label" | "remove";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
