import type { AvatarLocaleText } from "../core/types";

export const defaultAvatarText: AvatarLocaleText = {
  more: (count: number) => `${count} more`,
  status: {
    online: "Online",
    away: "Away",
    busy: "Busy",
    offline: "Offline",
  },
};
