import { isValidPostalCode, normalizePostalCode } from './postal';

export type SearchIntent =
  | { kind: 'postal' | 'text'; query: string }
  | { kind: 'invalid'; message: string };

export function resolveSearchIntent(raw: string): SearchIntent {
  const query = raw.trim().replace(/\s+/g, ' ');
  if (!query) return { kind: 'invalid', message: 'Enter a postal code, representative name, city, area or riding.' };
  if (isValidPostalCode(query)) return { kind: 'postal', query: normalizePostalCode(query) };
  // Only reserve distinctly postal-looking input. Names, short cities and
  // numbered wards (e.g. Ward 2) must remain text searches.
  if (/^[a-z]\d/i.test(query) || /^[a-z]\s+\d/i.test(query)) {
    return { kind: 'invalid', message: 'Enter a complete Canadian postal code in the format A1A 1A1, or search by name, city, area or riding.' };
  }
  return { kind: 'text', query };
}

export function textSearchKey(query: string): string {
  // Encode spaces so the legacy postal cache normalizer cannot merge words.
  return `text:${encodeURIComponent(query.trim().replace(/\s+/g, ' ').toLowerCase())}`;
}
