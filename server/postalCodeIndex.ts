import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PostalCodeEntry {
  postalCode: string;
  latitude: number;
  longitude: number;
}

class PostalCodeIndex {
  private data: Map<string, { latitude: number; longitude: number }> = new Map();

  constructor() {
    this.loadData();
  }

  private async loadData() {
    try {
      const csvPath = path.join(__dirname, '../../pccf_2021_clean.csv');
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.split('\n');

      // Skip header and process data
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV properly handling quoted fields
        const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)"$/);
        if (match) {
          const [, postalCode, lat, lng] = match;
          this.data.set(postalCode.toUpperCase(), {
            latitude: parseFloat(lat),
            longitude: parseFloat(lng)
          });
        }
      }

      console.log(`Loaded ${this.data.size} postal codes into memory`);
    } catch (error) {
      console.error('Error loading postal code data:', error);
    }
  }

  getCoordinates(postalCode: string): { latitude: number; longitude: number } | null {
    const cleanCode = postalCode.toUpperCase().replace(/\s+/g, '');
    return this.data.get(cleanCode) || null;
  }

  // For performance: support partial FSA (first 3 chars) lookup
  getCoordinatesByFSA(fsa: string): { latitude: number; longitude: number } | null {
    const cleanFSA = fsa.toUpperCase().replace(/\s+/g, '');

    // Find first postal code that matches this FSA
    for (const [postalCode, coords] of Array.from(this.data.entries())) {
      if (postalCode.startsWith(cleanFSA)) {
        return coords;
      }
    }
    return null;
  }

  getAllPostalCodes(): string[] {
    return Array.from(this.data.keys());
  }
}

// Singleton instance
const postalCodeIndex = new PostalCodeIndex();

export function getCoordinatesFromPostalCodeCSV(postalCode: string): { latitude: number; longitude: number } | null {
  return postalCodeIndex.getCoordinates(postalCode);
}

export function getCoordinatesByFSA(fsa: string): { latitude: number; longitude: number } | null {
  return postalCodeIndex.getCoordinatesByFSA(fsa);
}