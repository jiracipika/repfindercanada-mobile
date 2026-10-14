/**
 * Client-side Postal Code Lookup - Offline Canadian Representative Finder
 * Uses local binary postal code data + Represent API for complete offline functionality
 */

import { isValidPostalCode, normalizePostalCode } from './postal';

export interface PostalCodeData {
  latitude: number;
  longitude: number;
  /**
   * "exact" = the full code is in the bundled index. "prefix" = the code was
   * introduced after the data snapshot (Canada Post adds codes continuously);
   * coordinates come from the longest matching prefix instead.
   */
  matchedOn?: "exact" | "prefix";
  /** The prefix that matched, when matchedOn is "prefix" (e.g. "L6E0"). */
  matchedPrefix?: string;
}

class LocalPostalLookup {
  private index: Record<string, number> | null = null;
  private coordinates: Float32Array | null = null;
  private loaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;
  /** Memoized prefix fallbacks: prefix -> coords of the first indexed code under it. */
  private prefixCache: Map<string, { latitude: number; longitude: number } | null> = new Map();
  /** Lazily sorted key list for O(log n) prefix fallback lookups. */
  private sortedKeys: string[] | null = null;

  /**
   * First indexed code under `prefix` via binary search over the sorted key
   * list, or null. Falls back to a linear scan if the keys aren't sorted.
   */
  private firstKeyUnderPrefix(prefix: string): string | null {
    if (!this.index) return null;
    if (!this.sortedKeys) {
      const keys = Object.keys(this.index);
      let sorted = true;
      for (let i = 1; i < keys.length; i++) {
        if (keys[i - 1] > keys[i]) { sorted = false; break; }
      }
      this.sortedKeys = sorted ? keys : keys.sort();
    }
    const keys = this.sortedKeys;
    let lo = 0, hi = keys.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] >= prefix) { ans = mid; hi = mid - 1; } else { lo = mid + 1; }
    }
    return ans >= 0 && keys[ans].startsWith(prefix) ? keys[ans] : null;
  }

  constructor() {
    // Start loading immediately when created
    this.loadingPromise = this.loadData();
  }

  private async loadData(): Promise<void> {
    try {

      // Load index JSON
      const indexResponse = await fetch('/data/postal_index.json');
      if (!indexResponse.ok) {
        throw new Error(`Failed to load postal index: ${indexResponse.status}`);
      }
      this.index = await indexResponse.json();

      // Load binary coordinates
      const binaryResponse = await fetch('/data/postal_data.bin');
      if (!binaryResponse.ok) {
        throw new Error(`Failed to load postal coordinates: ${binaryResponse.status}`);
      }
      const arrayBuffer = await binaryResponse.arrayBuffer();
      this.coordinates = new Float32Array(arrayBuffer);

      this.loaded = true;
    } catch (error) {
      console.error('[LocalPostalLookup] Error loading postal data:', error);
      throw error;
    }
  }

  /**
   * Wait for postal data to be loaded
   */
  async waitForLoad(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
    if (!this.loaded) {
      throw new Error('Postal data failed to load');
    }
  }

  /**
   * Get coordinates for a specific postal code
   */
  getCoordinates(postalCode: string): PostalCodeData | null {
    if (!this.loaded || !this.index || !this.coordinates) {
      console.warn('[LocalPostalLookup] Data not loaded yet');
      return null;
    }

    const cleanCode = postalCode.toUpperCase().replace(/\s+/g, '');
    const index = this.index[cleanCode];

    if (typeof index === 'number') {
      return {
        latitude: this.coordinates[index],
        longitude: this.coordinates[index + 1],
        matchedOn: 'exact',
      };
    }

    // The code was introduced after the bundled data snapshot (Canada Post
    // adds delivery points continuously — e.g. Markham's L6E0W3 postdates the
    // 2021 PCCF). Fall back to the LONGEST matching prefix: neighbouring codes
    // in the same block (W2), intersection (L6E0) or FSA (L6E) resolve to the
    // same electoral districts. The scan walks every key once, then memoizes.
    for (const len of [5, 4, 3]) {
      const prefix = cleanCode.slice(0, len);
      if (prefix.length < 3) break;
      let hit = this.prefixCache.get(prefix);
      if (hit === undefined) {
        hit = null;
        const candidate = this.firstKeyUnderPrefix(prefix);
        if (candidate) {
          const i = this.index[candidate];
          hit = { latitude: this.coordinates[i], longitude: this.coordinates[i + 1] };
        }
        this.prefixCache.set(prefix, hit);
      }
      if (hit) {
        return { ...hit, matchedOn: 'prefix', matchedPrefix: prefix };
      }
    }
    return null;
  }

  /**
   * Get coordinates by FSA (first 3 characters of postal code)
   * Useful for partial matches or when exact postal code isn't found
   */
  getCoordinatesByFSA(fsa: string): PostalCodeData | null {
    if (!this.loaded || !this.index || !this.coordinates) {
      console.warn('[LocalPostalLookup] Data not loaded yet');
      return null;
    }

    const cleanFSA = fsa.toUpperCase().replace(/\s+/g, '');

    // Find first postal code that matches this FSA
    for (const postalCode of Object.keys(this.index)) {
      if (postalCode.startsWith(cleanFSA)) {
        const index = this.index[postalCode];
        return {
          latitude: this.coordinates[index],
          longitude: this.coordinates[index + 1]
        };
      }
    }
    return null;
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get statistics about loaded data
   */
  getStats(): { totalPostalCodes: number; dataSize: number } {
    if (!this.loaded) {
      return { totalPostalCodes: 0, dataSize: 0 };
    }

    return {
      totalPostalCodes: Object.keys(this.index!).length,
      dataSize: this.coordinates ? this.coordinates.length * 4 : 0
    };
  }

  /**
   * Validate Canadian postal code format (canonical validator in lib/postal.ts)
   */
  static isValidCanadianPostalCode(postalCode: string): boolean {
    return isValidPostalCode(postalCode);
  }

  /**
   * Normalize Canadian postal code format (canonical normalizer in lib/postal.ts)
   */
  static normalizePostalCode(postalCode: string): string {
    return normalizePostalCode(postalCode);
  }
}

// Singleton instance
const localPostalLookup = new LocalPostalLookup();

// Export functions
export async function getCoordinatesFromPostalCodeLocal(postalCode: string): Promise<PostalCodeData | null> {
  await localPostalLookup.waitForLoad();
  return localPostalLookup.getCoordinates(postalCode);
}

export async function getCoordinatesByFSALocal(fsa: string): Promise<PostalCodeData | null> {
  await localPostalLookup.waitForLoad();
  return localPostalLookup.getCoordinatesByFSA(fsa);
}

export function isLocalDataLoaded(): boolean {
  return localPostalLookup.isLoaded();
}

export function getLocalDataStats(): { totalPostalCodes: number; dataSize: number } {
  return localPostalLookup.getStats();
}

export { LocalPostalLookup };