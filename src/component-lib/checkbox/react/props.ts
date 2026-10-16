export type CheckboxSlot = "root" | "control" | "input" | "label" | "description" | "error";

export type CheckboxGroupSlot = "root" | "legend" | "description" | "items" | "error";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
