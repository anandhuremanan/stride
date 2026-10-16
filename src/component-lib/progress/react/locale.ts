import type { ProgressLocaleText } from "../core/types";

export const defaultProgressText: ProgressLocaleText = {
  label: "Progress",
  valueText: (percent: number) => `${percent}%`,
  working: "Working\u2026",
};
