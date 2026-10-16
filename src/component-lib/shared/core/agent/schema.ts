/*
 * A JSON Schema checker for the subset in `types.ts`.
 *
 * Written rather than installed, for the same reason the rest of the library
 * ships no dependencies: a component you copy into your project must not drag
 * a validator in with it. The subset is small enough that the whole thing fits
 * on one screen, and large enough to express every intent schema we generate.
 *
 * `oneOf` is where the care goes. A union of discriminated branches that all
 * fail produces one useless error ("matched no branch") unless you work out
 * which branch the caller *meant*. So branches are scored by how many of their
 * `const` discriminators matched, and the errors reported come from the best
 * candidate.
 */

import type { JsonSchema, JsonSchemaType } from "./types";

export interface SchemaIssue {
  path: string;
  code: string;
  message: string;
}

const typeOf = (value: unknown): JsonSchemaType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return "object";
};

const matchesType = (value: unknown, expected: JsonSchemaType): boolean => {
  const actual = typeOf(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
};

const show = (value: unknown): string =>
  typeof value === "string" ? JSON.stringify(value) : String(value);

const join = (path: string, key: string | number): string =>
  typeof key === "number" ? `${path}[${key}]` : path === "" ? key : `${path}.${key}`;

/** Every `const`-valued property this schema pins, for scoring `oneOf` branches. */
function discriminators(schema: JsonSchema): [string, unknown][] {
  const out: [string, unknown][] = [];
  for (const [key, child] of Object.entries(schema.properties ?? {})) {
    if (child.const !== undefined) out.push([key, child.const]);
  }
  return out;
}

function scoreBranch(value: unknown, schema: JsonSchema): number {
  if (typeOf(value) !== "object") return 0;
  const record = value as Record<string, unknown>;
  let score = 0;
  for (const [key, expected] of discriminators(schema)) {
    if (record[key] === expected) score += 1;
  }
  return score;
}

function checkInto(out: SchemaIssue[], value: unknown, schema: JsonSchema, path: string): void {
  const add = (code: string, message: string, at = path) => out.push({ path: at, code, message });

  if (schema.oneOf) {
    const results = schema.oneOf.map((branch) => {
      const issues: SchemaIssue[] = [];
      checkInto(issues, value, branch, path);
      return { branch, issues, score: scoreBranch(value, branch) };
    });
    const passing = results.filter((r) => r.issues.length === 0);
    if (passing.length === 1) return;
    if (passing.length > 1) {
      add("ambiguous-union", "value matches more than one schema branch");
      return;
    }
    // Prefer the branch whose discriminators matched; fall back to the nearest miss.
    const best = results.reduce((a, b) =>
      b.score > a.score || (b.score === a.score && b.issues.length < a.issues.length) ? b : a,
    );
    if (best.score === 0) {
      add("no-matching-branch", "value does not match any permitted shape");
      return;
    }
    out.push(...best.issues);
    return;
  }

  if (schema.anyOf) {
    const passes = schema.anyOf.some((branch) => {
      const issues: SchemaIssue[] = [];
      checkInto(issues, value, branch, path);
      return issues.length === 0;
    });
    if (!passes) add("no-matching-branch", "value does not match any permitted shape");
    return;
  }

  if (schema.const !== undefined && value !== schema.const) {
    add("const", `expected ${show(schema.const)}`);
    return;
  }

  if (schema.enum && !schema.enum.some((option) => option === value)) {
    add("enum", `expected one of ${schema.enum.map(show).join(", ")}, got ${show(value)}`);
    return;
  }

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => matchesType(value, t))) {
      add("type", `expected ${expected.join(" or ")}, got ${typeOf(value)}`);
      return;
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum)
      add("minimum", `must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum)
      add("maximum", `must be at most ${schema.maximum}`);
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      add("min-length", `must be at least ${schema.minLength} characters`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      add("max-length", `must be at most ${schema.maxLength} characters`);
    /*
     * `pattern` compiles to a RegExp, so a catastrophic one is a denial of
     * service. Every schema this library generates comes from a live runtime
     * contract and carries no pattern at all. If you validate against a schema
     * that travelled with an installed component — a passport's
     * `operations[].input`, say — strip `pattern` first.
     */
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value))
      add("pattern", `must match ${schema.pattern}`);
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      add("min-items", `needs at least ${schema.minItems} item(s)`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      add("max-items", `takes at most ${schema.maxItems} item(s)`);
    if (schema.items) {
      value.forEach((item, i) => checkInto(out, item, schema.items!, join(path, i)));
    }
    return;
  }

  if (typeOf(value) === "object") {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (record[key] === undefined) add("required", `"${key}" is required`, join(path, key));
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (record[key] !== undefined) checkInto(out, record[key], child, join(path, key));
    }
    if (schema.additionalProperties === false) {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(record)) {
        if (!known.has(key)) add("additional-property", `"${key}" is not a known field`, join(path, key));
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      const known = new Set(Object.keys(schema.properties ?? {}));
      for (const [key, item] of Object.entries(record)) {
        if (!known.has(key)) checkInto(out, item, schema.additionalProperties, join(path, key));
      }
    }
  }
}

/** Every way `value` fails `schema`. An empty array means it passed. */
export function checkSchema(value: unknown, schema: JsonSchema): SchemaIssue[] {
  const out: SchemaIssue[] = [];
  checkInto(out, value, schema, "");
  return out;
}
