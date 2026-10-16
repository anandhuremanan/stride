/*
 * Metrics for the two standard-14 fonts the PDF exporter uses.
 *
 * Helvetica and Helvetica-Bold are built into every conforming PDF viewer, so
 * nothing is embedded and the export stays dependency-free. The trade is
 * WinAnsi (CP1252) coverage — Latin-1 plus a few typographic characters. Text
 * outside it is replaced with "?" rather than silently dropped, so a wrong
 * glyph is visible instead of a missing column.
 *
 * Widths are advance widths in 1/1000 em, indexed from character code 32. A
 * zero means the code is unused in WinAnsi; `encode` never produces one.
 */

// prettier-ignore
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, 0,
  556, 0, 222, 556, 333, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0,
  0, 222, 222, 333, 333, 350, 556, 1000, 333, 1000, 500, 333, 944, 0, 500, 667,
  278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 556, 537, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 584, 611, 556, 556, 556, 556, 500, 556, 500,
];

// prettier-ignore
const HELVETICA_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584, 0,
  556, 0, 278, 556, 500, 1000, 556, 556, 333, 1000, 667, 333, 1000, 0, 611, 0,
  0, 278, 278, 500, 500, 350, 556, 1000, 333, 1000, 556, 333, 944, 0, 500, 667,
  278, 333, 556, 556, 556, 556, 280, 556, 333, 737, 370, 556, 584, 333, 737, 333,
  400, 584, 333, 333, 333, 611, 556, 278, 333, 333, 365, 556, 834, 834, 834, 611,
  722, 722, 722, 722, 722, 722, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278,
  722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611,
  556, 556, 556, 556, 556, 556, 889, 556, 556, 556, 556, 556, 278, 278, 278, 278,
  611, 611, 611, 611, 611, 611, 611, 584, 611, 611, 611, 611, 611, 556, 611, 556,
];

export type PdfFont = "regular" | "bold";

/** Code points WinAnsi keeps in 0x80-0x9F, where Latin-1 has control codes. */
const HIGH = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

const QUESTION = 0x3f;
const ELLIPSIS = 0x85;
const SPACE = 0x20;

/**
 * Encodes text as WinAnsi bytes. Characters the encoding cannot carry become
 * "?", and control characters become spaces so a stray tab or newline in a cell
 * cannot break the line layout.
 */
export function encode(text: string): number[] {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.codePointAt(0) ?? QUESTION;

    if (code === 0x09 || code === 0x0a || code === 0x0d) bytes.push(SPACE);
    else if (code >= 0x20 && code <= 0x7e) bytes.push(code);
    else if (code >= 0xa0 && code <= 0xff) bytes.push(code);
    else bytes.push(HIGH.get(code) ?? QUESTION);
  }

  return bytes;
}

/** Width of already-encoded bytes, in points, at `size`. */
export function widthOf(bytes: readonly number[], font: PdfFont, size: number): number {
  const widths = font === "bold" ? HELVETICA_BOLD : HELVETICA;
  let total = 0;

  for (const byte of bytes) total += widths[byte - 32] ?? 0;

  return (total * size) / 1000;
}

/**
 * Trims bytes to `max` points, ending in an ellipsis when anything was cut.
 * Returns an empty run when not even the ellipsis fits.
 */
export function fit(
  bytes: readonly number[],
  font: PdfFont,
  size: number,
  max: number,
): number[] {
  if (widthOf(bytes, font, size) <= max) return [...bytes];

  const room = max - widthOf([ELLIPSIS], font, size);
  if (room < 0) return [];

  const widths = font === "bold" ? HELVETICA_BOLD : HELVETICA;
  let used = 0;
  let end = 0;

  while (end < bytes.length) {
    const next = used + ((widths[bytes[end] - 32] ?? 0) * size) / 1000;
    if (next > room) break;
    used = next;
    end++;
  }

  return [...bytes.slice(0, end), ELLIPSIS];
}

/**
 * A PDF literal string body, without the surrounding parentheses. Only the
 * three delimiters need escaping; every other byte is legal as-is.
 */
export function literal(bytes: readonly number[]): string {
  let out = "";

  for (const byte of bytes) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += "\\";
    out += String.fromCharCode(byte);
  }

  return out;
}
