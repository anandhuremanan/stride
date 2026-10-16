export type ToasterSlot =
  | "region"
  | "list"
  | "toast"
  | "icon"
  | "content"
  | "title"
  | "description"
  | "actions"
  | "action"
  | "cancel"
  | "close";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
