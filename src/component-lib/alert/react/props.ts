export type AlertSlot =
  | "root"
  | "icon"
  | "content"
  | "title"
  | "description"
  | "actions"
  | "dismiss";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
