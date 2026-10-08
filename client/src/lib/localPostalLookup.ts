/**
 * Client-side Postal Code Lookup - Offline Canadian Representative Finder
 * Uses local binary postal code data + Represent API for complete offline functionality
 */

import { isValidPostalCode, normalizePostalCode } from './postal';

export interface PostalCodeData {
  latitude: number;
  longitude: number;
}

class LocalPostalLookup {
  private index: Record<string, number> | null = null;
  private coordinates: Float32Array | null = null;
  private loaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

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

    if (typeof index !== 'number') {
      return null;
    }

    return {
      latitude: this.coordinates[index],
      longitude: this.coordinates[index + 1]
    };
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