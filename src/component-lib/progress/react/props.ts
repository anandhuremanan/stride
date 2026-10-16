export type ProgressSlot = "root" | "header" | "label" | "value" | "track" | "bar";

export type CircularProgressSlot = "root" | "svg" | "track" | "bar" | "label";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
