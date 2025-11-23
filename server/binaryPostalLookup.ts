import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BinaryPostalLookup {
  private index: Record<string, number> = {};
  private coordinates: Float32Array | null = null;
  private loaded: boolean = false;

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      const indexPath = path.resolve(process.cwd(), 'postal_index.json');
      const dataPath = path.resolve(process.cwd(), 'postal_data.bin');

      // Check if files exist
      if (!fs.existsSync(indexPath) || !fs.existsSync(dataPath)) {
        console.warn('Compressed postal data files not found. Please run compressPostalData.ts first.');
        return;
      }

      // Load index
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      this.index = JSON.parse(indexContent);

      // Load binary coordinates
      const binaryData = fs.readFileSync(dataPath);
      this.coordinates = new Float32Array(binaryData.buffer, binaryData.byteOffset, binaryData.byteLength / 4);

      this.loaded = true;
      console.log(`Loaded binary postal data: ${Object.keys(this.index).length} postal codes`);
    } catch (error) {
      console.error('Error loading binary postal data:', error);
    }
  }

  getCoordinates(postalCode: string): { latitude: number; longitude: number } | null {
    if (!this.loaded || !this.coordinates) {
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

  // For performance: support partial FSA (first 3 chars) lookup
  getCoordinatesByFSA(fsa: string): { latitude: number; longitude: number } | null {
    if (!this.loaded || !this.coordinates) {
      return null;
    }

    const cleanFSA = fsa.toUpperCase().replace(/\s+/g, '');

    // Find first postal code that matches this FSA
    for (const postalCode of Object.keys(this.index)) {
      if (postalCode.startsWith(cleanFSA)) {
        const index = this.index[postalCode];
        return {
          latitude: this.coordinates![index],
          longitude: this.coordinates![index + 1]
        };
      }
    }
    return null;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getStats(): { totalPostalCodes: number; dataSize: number } {
    if (!this.loaded) {
      return { totalPostalCodes: 0, dataSize: 0 };
    }

    return {
      totalPostalCodes: Object.keys(this.index).length,
      dataSize: this.coordinates ? this.coordinates.length * 4 : 0
    };
  }
}

// Singleton instance
const binaryPostalLookup = new BinaryPostalLookup();

export function getCoordinatesFromPostalCodeBinary(postalCode: string): { latitude: number; longitude: number } | null {
  return binaryPostalLookup.getCoordinates(postalCode);
}

export function getCoordinatesByFSABinary(fsa: string): { latitude: number; longitude: number } | null {
  return binaryPostalLookup.getCoordinatesByFSA(fsa);
}

export function isBinaryDataLoaded(): boolean {
  return binaryPostalLookup.isLoaded();
}

export function getPostalDataStats(): { totalPostalCodes: number; dataSize: number } {
  return binaryPostalLookup.getStats();
}