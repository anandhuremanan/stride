import type { BadgeLocaleText } from "../core/types";

export const defaultBadgeText: BadgeLocaleText = {
  remove: (label: string) => `Remove ${label}`,
};
