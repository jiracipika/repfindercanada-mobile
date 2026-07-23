import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a compressed binary format for postal codes
function compressPostalData() {
  const csvPath = path.resolve(process.cwd(), 'pccf_2021_clean.csv');
  const outputPath = path.resolve(process.cwd(), 'postal_data.bin');
  const indexPath = path.resolve(process.cwd(), 'postal_index.json');

  console.log('Reading CSV data...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');

  const postalCodes: string[] = [];
  const tempCoords: number[] = [];
  const postalCodeMap = new Map<string, { lat: number; lng: number }>();

  // Skip header and process data
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/^"([^"]+)","([^"]+)","([^"]+)"$/);
    if (match) {
      const [, postalCode, lat, lng] = match;
      const cleanCode = postalCode.toUpperCase();

      // Use first occurrence of each postal code (standard approach)
      if (!postalCodeMap.has(cleanCode)) {
        postalCodeMap.set(cleanCode, {
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        });
      }
    }
  }

  // Convert map to arrays
  for (const [postalCode, coords] of Array.from(postalCodeMap.entries())) {
    postalCodes.push(postalCode);
    tempCoords.push(coords.lat);
    tempCoords.push(coords.lng);
  }

  // Convert to Float32Array at the end
  const coordinates = new Float32Array(tempCoords);

  console.log(`Processing ${postalCodes.length} postal codes...`);

  // Create index mapping for fast lookup
  const index: Record<string, number> = {};
  postalCodes.forEach((code, i) => {
    index[code] = i * 2; // *2 because we store lat + lng for each code
  });

  // Write binary coordinates
  fs.writeFileSync(outputPath, Buffer.from(coordinates.buffer));

  // Write JSON index
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  const csvSize = fs.statSync(csvPath).size;
  const binSize = fs.statSync(outputPath).size;
  const indexSize = fs.statSync(indexPath).size;

  console.log(`Compression complete:`);
  console.log(`Original CSV: ${(csvSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Binary data: ${(binSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Index: ${(indexSize / 1024).toFixed(2)} KB`);
  console.log(`Total: ${((binSize + indexSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Compression ratio: ${((1 - (binSize + indexSize) / csvSize) * 100).toFixed(1)}%`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  compressPostalData();
}

export { compressPostalData };