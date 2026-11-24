/**
 * Postal-code lookup over the bundled index. Pure and environment-free so the
 * worker, the main-thread fallback and the unit tests share one implementation.
 */

export interface PostalCodeData {
  latitude: number;
  longitude: number;
  /**
   * "exact" = the full code is in the bundled index. "prefix" = the code was
   * introduced after the data snapshot (Canada Post adds codes continuously);
   * coordinates come from the longest matching prefix instead.
   * "geocoder-ca" is added by freshPostalLookup for codes unknown even by prefix.
   */
  matchedOn?: "exact" | "prefix" | "geocoder-ca";
  /** The prefix that matched, when matchedOn is "prefix" (e.g. "L6E0"). */
  matchedPrefix?: string;
}

export interface PostalStore {
  /** Postal code (compact, uppercase) → offset of its latitude in `coordinates`. */
  index: Record<string, number>;
  /** [latitude, longitude] pairs. */
  coordinates: Float32Array;
}

/** Paths are root-relative, exactly as the app already fetches them. */
export const POSTAL_INDEX_URL = "/data/postal_index.json";
export const POSTAL_DATA_URL = "/data/postal_data.bin";

/**
 * Whether the index should be parsed in a worker on the page's protocol.
 * Android (https://localhost), the web build and PWAs are http(s). The iOS
 * shell serves from its own `capacitor://` scheme, where worker script loads
 * have not been verified on a device, so it keeps the main-thread path until
 * someone can confirm a worker starts there.
 */
export function supportsPostalWorker(protocol: string): boolean {
  return protocol === "https:" || protocol === "http:";
}

/** Fetch and decode both bundled files. Same work in a worker or on the main thread. */
export async function fetchPostalStore(): Promise<PostalStore> {
  const indexResponse = await fetch(POSTAL_INDEX_URL);
  if (!indexResponse.ok) {
    throw new Error(`Failed to load postal index: ${indexResponse.status}`);
  }
  // The expensive step: a 17 MB document and ~850k object keys. On the main
  // thread this took 345 ms on a desktop and 1.5 s under 4x CPU throttling.
  const index = (await indexResponse.json()) as Record<string, number>;

  const binaryResponse = await fetch(POSTAL_DATA_URL);
  if (!binaryResponse.ok) {
    throw new Error(`Failed to load postal coordinates: ${binaryResponse.status}`);
  }
  const coordinates = new Float32Array(await binaryResponse.arrayBuffer());

  return { index, coordinates };
}

/**
 * Prefixes tried, longest first: block (5 chars), intersection (4), FSA (3).
 * Neighbouring codes under any of them resolve to the same electoral districts.
 */
const PREFIX_LENGTHS = [5, 4, 3];

export class PostalLookup {
  /** Lazily sorted key list for O(log n) prefix fallback lookups. */
  private sortedKeys: string[] | null = null;
  /** prefix → coordinates of the first indexed code under it, or null. */
  private prefixCache = new Map<string, PostalCodeData | null>();

  constructor(private readonly store: PostalStore) {}

  /** Number of indexed postal codes. */
  get size(): number {
    return Object.keys(this.store.index).length;
  }

  private firstKeyUnderPrefix(prefix: string): string | null {
    if (!this.sortedKeys) {
      const keys = Object.keys(this.store.index);
      let sorted = true;
      for (let i = 1; i < keys.length; i++) {
        if (keys[i - 1] > keys[i]) {
          sorted = false;
          break;
        }
      }
      this.sortedKeys = sorted ? keys : keys.sort();
    }
    const keys = this.sortedKeys;
    let lo = 0;
    let hi = keys.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] >= prefix) {
        ans = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans >= 0 && keys[ans].startsWith(prefix) ? keys[ans] : null;
  }

  /** Coordinates for a postal code, by exact match then by longest prefix. */
  get(postalCode: string): PostalCodeData | null {
    const cleanCode = postalCode.toUpperCase().replace(/\s+/g, "");
    const at = this.store.index[cleanCode];

    if (typeof at === "number") {
      return {
        latitude: this.store.coordinates[at],
        longitude: this.store.coordinates[at + 1],
        matchedOn: "exact",
      };
    }

    for (const len of PREFIX_LENGTHS) {
      const prefix = cleanCode.slice(0, len);
      if (prefix.length < 3) break;
      let hit = this.prefixCache.get(prefix);
      if (hit === undefined) {
        const candidate = this.firstKeyUnderPrefix(prefix);
        const i = candidate ? this.store.index[candidate] : undefined;
        hit = typeof i === "number"
          ? { latitude: this.store.coordinates[i], longitude: this.store.coordinates[i + 1] }
          : null;
        this.prefixCache.set(prefix, hit);
      }
      if (hit) {
        return { ...hit, matchedOn: "prefix", matchedPrefix: prefix };
      }
    }
    return null;
  }
}
