/**
 * Canadian postal code utilities
 * Provides postal code normalization for the application
 */

/**
 * Normalize Canadian postal code to uppercase format without spaces
 * Example: "m1c 5e9" -> "M1C5E9"
 */
export function normalizePostalCode(postal: string): string {
  return postal.toUpperCase().replace(/\s+/g, "");
}