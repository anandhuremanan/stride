let segmenter: Intl.Segmenter | null | undefined;

/**
 * Characters as a person counts them. `"👍🏽".length` is 4 and `"é"` can be 2,
 * but each is one character here. Falls back to code points where
 * `Intl.Segmenter` is missing.
 */
export function countCharacters(value: string): number {
  if (!value) return 0;
  if (segmenter === undefined) {
    segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : null;
  }
  return segmenter ? Array.from(segmenter.segment(value)).length : Array.from(value).length;
}
