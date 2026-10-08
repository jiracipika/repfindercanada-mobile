/**
 * Behavioral smoke test for the canonical postal code module
 * (client/src/lib/postal.ts). Run: npx tsx scripts/postal-validator-smoke.ts
 */
import {
  isValidPostalCode,
  normalizePostalCode,
  postalKey,
  provinceFromPostalCode,
  compactPostalCode,
  POSTAL_MAX_LENGTH,
} from "../client/src/lib/postal";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (ok) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log("valid cases:");
check("K1A 0A9", isValidPostalCode("K1A 0A9"), true);
check("k1a0a9 (lowercase, no space)", isValidPostalCode("k1a0a9"), true);
check("  V6B 1A1  (padded)", isValidPostalCode("  V6B 1A1  "), true);
check("H0H 0H0", isValidPostalCode("H0H 0H0"), true);
check("m5v 2h1", isValidPostalCode("m5v 2h1"), true);
check("T0L 1K0", isValidPostalCode("T0L 1K0"), true);
check("X0A 0H0 (Nunavut)", isValidPostalCode("X0A 0H0"), true);

console.log("invalid cases:");
check("empty string", isValidPostalCode(""), false);
check("spaces only", isValidPostalCode("   "), false);
check("K1A 0A (5 chars)", isValidPostalCode("K1A 0A"), false);
check("K1A  0A9X (7 chars)", isValidPostalCode("K1A 0A9X"), false);
check("123 456 (all digits)", isValidPostalCode("123 456"), false);
check("AAAAAA (all letters)", isValidPostalCode("AAAAAA"), false);
check("K1A-0A9 (dash)", isValidPostalCode("K1A-0A9"), false);
// Canada Post excludes O in letter positions, but the app's historical
// validators (shape-only A1A1A1) accepted it — behaviour kept identical.
check("K1A 0O9 (letter O, shape-valid)", isValidPostalCode("K1A 0O9"), true);
check("0A1 A1A (digit first)", isValidPostalCode("0A1 A1A"), false);
check("K1A 0A9 trailing newline only whitespace ok? no — extra char", isValidPostalCode("K1A 0A9\nx"), false);

console.log("normalize:");
check("K1A 0A9 stays canonical", normalizePostalCode("K1A 0A9"), "K1A 0A9");
check("k1a0a9 → K1A 0A9", normalizePostalCode("k1a0a9"), "K1A 0A9");
check("  v6b1a1 → V6B 1A1", normalizePostalCode("  v6b1a1  "), "V6B 1A1");

console.log("keys:");
check("postalKey K1A 0A9", postalKey("K1A 0A9"), "K1A0A9");
check("postalKey k1a0a9", postalKey("k1a0a9"), "K1A0A9");
check("geo key preserved", postalKey("geo:45.4215,-75.697"), "GEO:45.4215,-75.697");

console.log("province from FSA:");
check("K → ON", provinceFromPostalCode("K1A 0A9"), "ON");
check("M → ON", provinceFromPostalCode("M5V 2H1"), "ON");
check("H → QC", provinceFromPostalCode("H2X 1Y6"), "QC");
check("V → BC", provinceFromPostalCode("V6B 1A1"), "BC");
check("T → AB", provinceFromPostalCode("T6T 0Y4"), "AB");
check("R → MB", provinceFromPostalCode("R3C 0A5"), "MB");
check("S → SK", provinceFromPostalCode("S4P 2Z2"), "SK");
check("A → NL", provinceFromPostalCode("A1C 5H5"), "NL");
check("B → NS", provinceFromPostalCode("B3H 1A1"), "NS");
check("C → PE", provinceFromPostalCode("C1A 1A1"), "PE");
check("E → NB", provinceFromPostalCode("E1C 4P5"), "NB");
check("Y → YT", provinceFromPostalCode("Y1A 1A1"), "YT");
check("X → NT", provinceFromPostalCode("X0A 0H0"), "NT");
check("unknown letter → ''", provinceFromPostalCode("Z9Z 9Z9"), "");

console.log("misc:");
check("compactPostalCode trims+uppercases", compactPostalCode(" k1a 0a9 "), "K1A0A9");
check("POSTAL_MAX_LENGTH is 7", POSTAL_MAX_LENGTH, 7);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
