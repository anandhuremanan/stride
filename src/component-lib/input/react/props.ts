export type InputSlot = "root" | "label" | "control" | "input" | "description" | "error" | "count";

export type OtpSlot = "root" | "label" | "cells" | "cell" | "separator" | "description" | "error";

// Shared with every other component, so class handling cannot drift.
export { cx } from "../../shared/core/cx";
