/**
 * Canonical Canadian postal code validation + normalization.
 *
 * Single source of truth — every validator/normalizer in the app delegates
 * here (search-form inline validation, localPostalLookup, backendSearchService,
 * searchCacheRepository cache keys).
 *
 * Canonical stored/display form is "A1A 1A1" (optional space on input,
 * always one space when 6 significant characters). Compact form "A1A1A1"
 * is used for keys (React Query / search cache).
 */

/** Canadian postal code: A1A1A1 (letter-digit-letter digit-letter-digit). */
const POSTAL_PATTERN = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;

/** A canonical postal code is 6 significant characters; allow one inner space. */
export const POSTAL_MAX_LENGTH = 7;

/** Uppercase and strip all whitespace. */
export function compactPostalCode(code: string): string {
  return (code || "").toUpperCase().replace(/\s+/g, "");
}

/** Canonical format test: accepts "A1A 1A1", "a1a1a1", " A1A1A1 " etc. */
export function isValidPostalCode(code: string): boolean {
  return POSTAL_PATTERN.test(compactPostalCode(code));
}

/**
 * Normalize to the canonical display form "A1A 1A1".
 * Invalid input is returned uppercased/compacted (no space) — callers
 * validate with isValidPostalCode when they need a guarantee.
 */
export function normalizePostalCode(code: string): string {
  const clean = compactPostalCode(code);
  return clean.length === 6 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
}

/** Stable cache / React Query key: compact uppercase, no spaces. */
export function postalKey(code: string): string {
  return compactPostalCode(code);
}

/**
 * Province/territory code from the postal code's first letter (FSA region).
 * Returns "" for unknown letters. X covers both NT and NU.
 */
const FSA_LETTER_TO_PROVINCE: Record<string, string> = {
  A: "NL",
  B: "NS",
  C: "PE",
  E: "NB",
  G: "QC",
  H: "QC",
  J: "QC",
  K: "ON",
  L: "ON",
  M: "ON",
  N: "ON",
  P: "ON",
  R: "MB",
  S: "SK",
  T: "AB",
  V: "BC",
  X: "NT",
  Y: "YT",
};

export function provinceFromPostalCode(code: string): string {
  const clean = compactPostalCode(code);
  return FSA_LETTER_TO_PROVINCE[clean.charAt(0)] ?? "";
}
