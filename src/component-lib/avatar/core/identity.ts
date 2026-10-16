/**
 * Turning a name into the two things an avatar needs when there is no picture:
 * a couple of letters, and a colour that is always the same for that person.
 *
 * Both are harder than they look, and both are wrong in a way that is hard to
 * notice from an English-speaking desk — which is why they are here, pure and
 * under test, rather than inline in the component.
 */

/**
 * Names are split on whitespace — `\s` covers the no-break space a copied name
 * often carries — and on the punctuation that joins parts of one.
 */
const SEPARATORS = /[\s._\-–—/\\|,]+/u;

/**
 * Letters from a name: two for a name with parts, one otherwise.
 *
 * `"Ada Lovelace"` gives `AL`, `"ada"` gives `A`, `"ada@example.com"` gives
 * `A` — an email is not a name, so only the part before the `@` is looked at
 * and never the domain.
 *
 * Two deliberate decisions:
 *
 * Characters are taken with `Intl.Segmenter` where it exists, so a name
 * beginning with an emoji, a surrogate pair or a letter carrying a combining
 * mark yields that whole character rather than half of it — `slice(0, 1)` on a
 * string is a byte operation wearing a costume.
 *
 * Scripts without letter case are left alone: uppercasing is meaningless for
 * CJK and can change the character. A Japanese name gives its first character,
 * not a mangled one.
 */
export function initials(name: string, max = 2): string {
  const source = name.trim().split("@")[0] ?? "";
  if (source === "") return "";

  const parts = source.split(SEPARATORS).filter(Boolean);
  if (parts.length === 0) return "";

  // One part is a single name or a handle: one letter is enough, and taking
  // two from "Madonna" gives "MA", which looks like a mistake.
  const chosen = parts.length === 1 ? [parts[0]] : [parts[0], parts[parts.length - 1]];

  return chosen
    .slice(0, max)
    .map((part) => firstCharacter(part))
    .join("");
}

function firstCharacter(part: string): string {
  const character = segmentFirst(part);
  // `toLocaleUpperCase` on a script with no case returns it unchanged, which is
  // the behaviour we want; it is the two-character mappings (ß → SS) that have
  // to be cut back to one.
  const upper = character.toLocaleUpperCase();
  return upper.length > character.length ? character : upper;
}

let segmenter: Intl.Segmenter | null | undefined;

function segmentFirst(text: string): string {
  if (segmenter === undefined) {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : null;
  }
  if (segmenter) {
    for (const { segment } of segmenter.segment(text)) return segment;
    return "";
  }
  // Without Segmenter, code points at least keep surrogate pairs whole.
  return Array.from(text)[0] ?? "";
}

/**
 * A stable index into a palette, from any string.
 *
 * The same person keeps the same colour on every page and in every session,
 * without anything being stored, because the hash is a pure function of their
 * name. FNV-1a: small, well spread for short strings, and not a security
 * decision — nothing here is a secret.
 */
export function colorIndex(seed: string, count: number): number {
  if (count <= 0) return 0;
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % count;
}

/**
 * How an avatar group splits: the faces shown, and how many are left over.
 *
 * The overflow counter takes one of the slots, so showing "+2" out of five
 * faces with `max: 3` means two faces and a counter, not three and a counter.
 */
export function splitGroup<T>(items: readonly T[], max: number): { shown: T[]; overflow: number } {
  if (max <= 0) return { shown: [], overflow: items.length };
  if (items.length <= max) return { shown: [...items], overflow: 0 };
  const shown = items.slice(0, max - 1);
  return { shown, overflow: items.length - shown.length };
}
