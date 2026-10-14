/**
 * Online rescue for postal codes the bundled 2021-PCCF index doesn't know at
 * all — not even by prefix, i.e. a brand-new FSA. geocoder.ca keeps
 * crowdsourced coordinates that include codes newer than any government
 * snapshot (its keyless tier is rate-limited, so results are cached per code
 * and this layer is only consulted when the LOCAL lookup fully misses —
 * offline behavior is unchanged).
 */

import type { PostalCodeData } from "./localPostalLookup";

const GEOCODER_TIMEOUT_MS = 8_000;
const CACHE_PREFIX = "repfinder:geocode:";

/** geocoder.ca coordinates for a code, or null on any failure/throttle. */
export async function fetchGeocoderCoordinates(postalCode: string): Promise<PostalCodeData | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODER_TIMEOUT_MS);
  try {
    const response = await fetch(`https://geocoder.ca/?locate=${encodeURIComponent(postalCode)}&json=1`, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) return null;
    const lat = Number((data as Record<string, unknown>).latt);
    const lng = Number((data as Record<string, unknown>).longt);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < 41 || lat > 84 || lng < -142 || lng > -52) return null; // outside Canada
    return { latitude: lat, longitude: lng, matchedOn: "geocoder-ca" };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Local lookup first (offline, authoritative for everything in the bundled
 * index); geocoder.ca only when the code is unknown even by prefix.
 */
export async function getCoordinatesWithFreshFallback(postalCode: string): Promise<PostalCodeData | null> {
  const { getCoordinatesFromPostalCodeLocal } = await import("./localPostalLookup");
  const local = await getCoordinatesFromPostalCodeLocal(postalCode);
  if (local) return local;

  const key = postalCode.toUpperCase().replace(/\s+/g, "");
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (cached) return JSON.parse(cached) as PostalCodeData;
  } catch {
    // private mode / storage disabled — fall through to the network
  }
  const fresh = await fetchGeocoderCoordinates(key);
  if (fresh) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(fresh));
    } catch {
      // caching is best-effort
    }
  }
  return fresh;
}
