/**
 * DEV-only self-test runner, fired by tapping the Version row 7 times
 * (Profile → App information). Results go to console + toast summary.
 *
 * Both this module's only caller and the tap counter are gated behind
 * `import.meta.env.DEV`, so the production bundle never includes it.
 */
import {
  isValidPostalCode,
  normalizePostalCode,
  provinceFromPostalCode,
} from "./postal";
import { PROD_WEB_URL, repShareUrl } from "./appUrls";

interface Check {
  name: string;
  run: () => boolean;
}

const checks: Check[] = [
  // Canonical postal validator/normalizer (lib/postal.ts)
  { name: "postal accepts A1A1A1", run: () => isValidPostalCode("A1A1A1") },
  { name: "postal accepts 'a1a 1a1'", run: () => isValidPostalCode("a1a 1a1") },
  { name: "postal rejects truncated A1A1A", run: () => !isValidPostalCode("A1A1A") },
  { name: "postal rejects digits-only", run: () => !isValidPostalCode("123456") },
  { name: "postal rejects empty", run: () => !isValidPostalCode("") },
  { name: "normalize lower → 'A1A 1A1'", run: () => normalizePostalCode("a1a1a1") === "A1A 1A1" },
  { name: "FSA M → ON", run: () => provinceFromPostalCode("M5V") === "ON" },
  { name: "FSA V → BC", run: () => provinceFromPostalCode("V6B") === "BC" },
  { name: "FSA invalid letter → empty", run: () => provinceFromPostalCode("Z9A") === "" },

  // Share URLs never leak the webview origin
  { name: "share origin is https", run: () => PROD_WEB_URL.startsWith("https://") },
  { name: "share origin is not localhost", run: () => !PROD_WEB_URL.includes("localhost") },
  { name: "repShareUrl deep-link form", run: () => repShareUrl(42) === `${PROD_WEB_URL}/?rep=42` },

  // PWA wiring present in the served document
  { name: "manifest <link> present", run: () => Boolean(document.querySelector('link[rel="manifest"]')) },
  { name: "theme-color meta present", run: () => Boolean(document.querySelector('meta[name="theme-color"]')) },
];

export interface SelfTestResult {
  passed: number;
  failed: string[];
}

export function runDevSelfTest(): SelfTestResult {
  const failed: string[] = [];
  let passed = 0;

  for (const check of checks) {
    let ok = false;
    try {
      ok = check.run();
    } catch {
      ok = false;
    }
    if (ok) passed += 1;
    else failed.push(check.name);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[dev-selftest] ${passed}/${checks.length} passed` +
      (failed.length ? ` — failed: ${failed.join(", ")}` : ""),
  );
  return { passed, failed };
}
