import type { CrumbSlot } from "./types";

/**
 * Collapses a long trail to its first and last crumbs with an ellipsis between,
 * once it has more than `maxItems`. Returns the trail unchanged when it fits.
 */
export function collapseItems(
  count: number,
  maxItems?: number,
  itemsBefore = 1,
  itemsAfter = 1,
): CrumbSlot[] {
  const before = Math.max(0, itemsBefore);
  const after = Math.max(1, itemsAfter);
  const all: CrumbSlot[] = Array.from({ length: count }, (_, index) => ({ kind: "item", index }));
  if (maxItems === undefined || count <= maxItems || before + after >= count) return all;

  const hidden = Array.from({ length: count - before - after }, (_, offset) => before + offset);
  return [...all.slice(0, before), { kind: "ellipsis", hidden }, ...all.slice(count - after)];
}

export interface JsonLdCrumb {
  name: string;
  href?: string;
}

/**
 * schema.org `BreadcrumbList` data, which search engines use to show the trail
 * in results. Relative links are resolved against `baseUrl`.
 */
export function toBreadcrumbJsonLd(items: readonly JsonLdCrumb[], baseUrl?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.href ? { item: baseUrl ? new URL(item.href, baseUrl).href : item.href } : {}),
    })),
  };
}
