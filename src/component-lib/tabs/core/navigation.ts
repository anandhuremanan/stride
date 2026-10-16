import type { NavigationOptions } from "./types";

/**
 * The tab a key moves to, skipping disabled tabs, or null when the key isn't a
 * tab key (or there is nowhere to go). Follows the WAI-ARIA tabs pattern.
 */
export function nextTab(
  tabs: readonly { disabled?: boolean }[],
  current: number,
  key: string,
  options: NavigationOptions = {},
): number | null {
  const { orientation = "horizontal", rtl = false, loop = true } = options;
  const count = tabs.length;
  if (count === 0) return null;

  const horizontal = orientation === "horizontal";
  const previousKey = horizontal ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
  const nextKey = horizontal ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";

  const scan = (start: number, step: 1 | -1): number | null => {
    let index = start;
    for (let visited = 0; visited < count; visited++) {
      if (index < 0 || index >= count) {
        if (!loop) return null;
        index = (index + count) % count;
      }
      if (!tabs[index].disabled) return index;
      index += step;
    }
    return null;
  };

  switch (key) {
    case nextKey:
      return scan(current + 1, 1);
    case previousKey:
      return scan(current - 1, -1);
    case "Home":
      return scan(0, 1);
    case "End":
      return scan(count - 1, -1);
    default:
      return null;
  }
}

/**
 * A DOM id for a tab or panel. Values may contain spaces or symbols, so they are
 * percent-encoded with `_` in place of `%`, which keeps different values distinct.
 */
export function tabDomId(base: string, part: "tab" | "panel", value: string): string {
  return `${base}-${part}-${encodeURIComponent(value).replace(/[%.!~*'()]/g, "_")}`;
}
