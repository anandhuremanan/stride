import type { ToasterLocaleText } from "../core/types";

export const defaultToasterText: ToasterLocaleText = {
  regionLabel: (hotkey) => `Notifications (${hotkey})`,
  close: "Close notification",
};
