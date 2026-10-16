import type { MenuLocaleText } from "../core/types";

export const defaultMenuText: MenuLocaleText = {
  label: "Menu",
  submenu: (label) => `${label} submenu`,
};
