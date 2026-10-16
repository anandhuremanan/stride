/*
 * Reading a number the way a person wrote it.
 *
 * "1 lakh", "₹1,00,000", "20%", "1.5k", "(2,400)" all denote numbers, and a
 * language model should not be the thing that converts them — it will be
 * confidently wrong about crore once in a while, and there is no way to tell
 * which time. This is deterministic code with a test for every form it claims
 * to read, which is what the coercion layer of the validator is for.
 *
 * Indian digit grouping (1,00,000) needs no special case: grouping separators
 * are stripped wholesale, so 1,00,000 and 100,000 land on the same number.
 */

export interface Quantity {
  value: number;
  /** The written form carried a percent sign or the word "percent". */
  percent: boolean;
  /** ISO code for the currency marker found, if any. */
  currency: string | null;
  /** The scale word that was applied, e.g. "lakh". Null when none was. */
  scale: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "₹": "INR", // ₹
  $: "USD",
  "€": "EUR", // €
  "£": "GBP", // £
  "¥": "JPY", // ¥
};

const CURRENCY_WORDS: Record<string, string> = {
  inr: "INR",
  rs: "INR",
  rupee: "INR",
  rupees: "INR",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  eur: "EUR",
  euro: "EUR",
  euros: "EUR",
  gbp: "GBP",
  pound: "GBP",
  pounds: "GBP",
};

/**
 * Scale words, longest first so "crores" is consumed before "cr" can match a
 * prefix of it.
 */
const SCALES: ReadonlyArray<readonly [string, number]> = [
  ["crores", 1e7],
  ["crore", 1e7],
  ["cr", 1e7],
  ["lakhs", 1e5],
  ["lakh", 1e5],
  ["lacs", 1e5],
  ["lac", 1e5],
  ["billion", 1e9],
  ["billions", 1e9],
  ["bn", 1e9],
  ["million", 1e6],
  ["millions", 1e6],
  ["mn", 1e6],
  ["thousand", 1e3],
  ["thousands", 1e3],
  ["hundred", 1e2],
  ["hundreds", 1e2],
  ["k", 1e3],
  ["m", 1e6],
  ["b", 1e9],
];

const PERCENT_WORDS = ["percent", "percentage", "pct", "pc"];

/*
 * Numbers written as words.
 *
 * "Revenue above one crore" is a sentence people type, and it used to fail
 * here — which was worse than it sounds, because the layer above tells a model
 * to pass quantities through *exactly as written* rather than convert them. So
 * the model did as it was told and the conversion it had been relieved of
 * simply never happened.
 *
 * Deliberately bounded: cardinals up to ninety-nine, and the scale words
 * already in `SCALES` do the rest ("five hundred", "ten lakh", "two crore").
 * `a`/`an` are left out — "a crore" is natural Indian English, but mapping a
 * bare article to 1 would turn any stray "a" into a number, and silently
 * reading junk as 1 is worse than refusing it.
 */
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** Replaces number words with digits, so the rest of the parser sees digits. */
function digitiseWords(text: string): string {
  const tens = Object.keys(TENS).join("|");
  const ones = Object.keys(ONES).join("|");

  return text
    // Compounds first: "twenty five" and "twenty-five" are one number.
    .replace(new RegExp(`\\b(${tens})[\\s-](${ones})\\b`, "g"), (_, ten, one) =>
      String(TENS[ten] + ONES[one]),
    )
    .replace(new RegExp(`\\b(${tens})\\b`, "g"), (word) => String(TENS[word]))
    .replace(new RegExp(`\\b(${ones})\\b`, "g"), (word) => String(ONES[word]));
}

export interface ParseQuantityOptions {
  /** Which character separates the fractional part. Default `"."`. */
  decimal?: "." | ",";
}

/**
 * Reads a written quantity, or returns null when the text is not one.
 *
 * Null means "this is not a number", which the caller should surface as a
 * validation failure rather than silently coercing to 0 or NaN.
 */
export function parseQuantity(
  input: string | number,
  options: ParseQuantityOptions = {},
): Quantity | null {
  if (typeof input === "number") {
    return Number.isFinite(input)
      ? { value: input, percent: false, currency: null, scale: null }
      : null;
  }

  let text = digitiseWords(input.trim().toLowerCase());
  if (text === "") return null;

  let negative = false;
  // Accountants' parentheses.
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  let currency: string | null = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) {
      currency = code;
      text = text.split(symbol).join(" ");
    }
  }

  let percent = false;
  if (text.includes("%")) {
    percent = true;
    text = text.split("%").join(" ");
  }

  // Split off alphabetic words so currency and scale can be matched exactly
  // rather than by substring, which would see "lakh" inside "lakhsomething".
  const words = text.match(/[a-z.]+/g) ?? [];
  for (const word of words) {
    const bare = word.replace(/\.$/, "");
    if (CURRENCY_WORDS[bare]) {
      currency ??= CURRENCY_WORDS[bare];
      text = text.replace(word, " ");
    } else if (PERCENT_WORDS.includes(bare)) {
      percent = true;
      text = text.replace(word, " ");
    }
  }

  let scale: string | null = null;
  let multiplier = 1;
  for (const [word, factor] of SCALES) {
    // Either a separate word, or glued to the digits as in "1.5k".
    const pattern = new RegExp(`(^|[\\s\\d.])${word}\\s*$`);
    if (pattern.test(text)) {
      scale = word;
      multiplier = factor;
      text = text.replace(new RegExp(`${word}\\s*$`), " ");
      break;
    }
  }

  const decimal = options.decimal ?? ".";
  let digits = text.replace(/\s+/g, "");
  if (digits.startsWith("-")) {
    negative = true;
    digits = digits.slice(1);
  } else if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (decimal === ",") {
    digits = digits.split(".").join("");
    digits = digits.replace(",", ".");
  } else {
    digits = digits.split(",").join("");
  }

  if (digits === "" || !/^\d*\.?\d*$/.test(digits) || !/\d/.test(digits)) return null;

  const magnitude = Number(digits);
  if (!Number.isFinite(magnitude)) return null;

  const value = (negative ? -1 : 1) * magnitude * multiplier;
  // Scaling by 1e5 and friends drifts in binary floating point; the inputs are
  // human-written, so rounding back to a sane precision is the honest answer.
  const rounded = multiplier === 1 ? value : Number(value.toPrecision(15));

  return { value: rounded, percent, currency, scale };
}
