/**
 * Postal Code Lookup Service
 * Combines Represent API for postal code → riding mapping with local IndexedDB for MP data
 */

import { searchFederalMPsByRiding } from './storage/representativeDatabase';
import type { FederalMP } from './data-sources/federalDataSource';

interface PostalCodeLookupResult {
  mp: FederalMP;
  riding: string;
  province: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'cache_manual' | 'represent_verified' | 'represent_unverified';
  warnings?: string[];
}

/**
 * Known postal code corrections
 * These override Represent API for known incorrect mappings
 */
const POSTAL_CODE_CORRECTIONS: Record<string, { riding: string; province: string; notes: string }> = {
  'M1C5E9': {
    riding: 'Scarborough—Guildwood—Rouge Park',
    province: 'Ontario',
    notes: 'User reported - Represent API incorrectly returns Scarborough—Woburn',
  },
  // Add more corrections here as they are reported
};

/**
 * Normalize postal code to standard format (uppercase, no spaces)
 */
function normalizePostalCode(postalCode: string): string {
  return postalCode.toUpperCase().replace(/\s+/g, '');
}

/**
 * Normalize riding name for comparison
 * Handles variations in dashes and spacing
 */
function normalizeRidingName(ridingName: string): string {
  return ridingName
    .toLowerCase()
    .trim()
    .replace(/[—–−]/g, '-') // Normalize all dash types
    .replace(/\s+/g, ' '); // Normalize spacing
}

/**
 * Lookup riding name from postal code using Represent API
 */
async function lookupRidingFromRepresentAPI(postalCode: string): Promise<{
  riding: string;
  province: string;
  boundaryUrl?: string;
} | null> {
  try {
    const response = await fetch(
      `https://represent.opennorth.ca/postcodes/${postalCode}/?sets=federal-electoral-districts-2023-representation-order`
    );

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status}`);
    }

    const data = await response.json();

    // Find the federal electoral district representative
    const federalRep = data.representatives_centroid?.find(
      (rep: any) => rep.elected_office === 'MP'
    );

    if (!federalRep) {
      return null;
    }

    return {
      riding: federalRep.district_name,
      province: data.province || 'Unknown',
      boundaryUrl: federalRep.related?.boundary_url,
    };
  } catch (error) {
    console.error('[PostalCodeLookup] Represent API error:', error);
    return null;
  }
}

/**
 * Main postal code lookup function
 * 1. Check manual corrections first
 * 2. Use Represent API for postal code → riding
 * 3. Search local IndexedDB for MP
 * 4. Verify MP exists and return with confidence level
 */
export async function lookupByPostalCode(
  postalCode: string
): Promise<PostalCodeLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);

  console.log(`[PostalCodeLookup] Looking up postal code: ${normalized}`);

  // Step 1: Check manual corrections
  const correction = POSTAL_CODE_CORRECTIONS[normalized];
  if (correction) {
    console.log(`[PostalCodeLookup] Using manual correction for ${normalized}`);

    const mps = await searchFederalMPsByRiding(correction.riding);

    if (mps.length === 0) {
      console.warn(
        `[PostalCodeLookup] Manual correction riding not found: ${correction.riding}`
      );
      return null;
    }

    return {
      mp: mps[0],
      riding: correction.riding,
      province: correction.province,
      confidence: 'high',
      source: 'cache_manual',
      warnings: [],
    };
  }

  // Step 2: Use Represent API for postal code → riding lookup
  const representResult = await lookupRidingFromRepresentAPI(normalized);

  if (!representResult) {
    console.warn(`[PostalCodeLookup] Represent API returned no results for ${normalized}`);
    return null;
  }

  console.log(
    `[PostalCodeLookup] Represent API returned: ${representResult.riding}`
  );

  // Step 3: Search local IndexedDB for MP by riding name
  let mps = await searchFederalMPsByRiding(representResult.riding);

  // If exact match fails, try fuzzy matching
  if (mps.length === 0) {
    console.log(`[PostalCodeLookup] Exact match failed, trying fuzzy match...`);

    // Get all MPs and do fuzzy matching
    const { getAllFederalMPs } = await import('./storage/representativeDatabase');
    const allMPs = await getAllFederalMPs();

    const normalizedSearch = normalizeRidingName(representResult.riding);

    mps = allMPs.filter((mp) => {
      const normalizedRiding = normalizeRidingName(mp.riding);
      return (
        normalizedRiding === normalizedSearch ||
        normalizedRiding.includes(normalizedSearch) ||
        normalizedSearch.includes(normalizedRiding)
      );
    });
  }

  if (mps.length === 0) {
    console.warn(
      `[PostalCodeLookup] No MP found for riding: ${representResult.riding}`
    );

    return {
      mp: {
        id: 'unknown',
        name: 'Unknown',
        firstName: '',
        lastName: '',
        riding: representResult.riding,
        province: representResult.province,
        party: 'Unknown',
        startDate: '',
      },
      riding: representResult.riding,
      province: representResult.province,
      confidence: 'low',
      source: 'represent_unverified',
      warnings: [
        `Riding "${representResult.riding}" not found in official House of Commons data. ` +
        `This may be due to redistribution or API data mismatch. ` +
        `Please verify with Elections Canada.`,
      ],
    };
  }

  // Step 4: Return verified result
  const mp = mps[0];

  console.log(`[PostalCodeLookup] ✓ Found MP: ${mp.name} (${mp.riding})`);

  return {
    mp,
    riding: mp.riding, // Use official HoC riding name
    province: mp.province,
    confidence: 'high',
    source: 'represent_verified',
    warnings: [],
  };
}

/**
 * Add a postal code correction
 * Useful for reporting incorrect mappings
 */
export function addPostalCodeCorrection(
  postalCode: string,
  riding: string,
  province: string,
  notes?: string
): void {
  const normalized = normalizePostalCode(postalCode);

  POSTAL_CODE_CORRECTIONS[normalized] = {
    riding,
    province,
    notes: notes || 'User correction',
  };

  console.log(`[PostalCodeLookup] Added correction: ${normalized} → ${riding}`);

  // TODO: Save to IndexedDB or Capacitor Preferences for persistence
}

/**
 * Get all postal code corrections
 */
export function getPostalCodeCorrections(): typeof POSTAL_CODE_CORRECTIONS {
  return { ...POSTAL_CODE_CORRECTIONS };
}

/**
 * Export corrections for sharing/backup
 */
export function exportCorrections(): string {
  return JSON.stringify(POSTAL_CODE_CORRECTIONS, null, 2);
}

/**
 * Import corrections from JSON
 */
export function importCorrections(json: string): void {
  try {
    const corrections = JSON.parse(json);
    Object.assign(POSTAL_CODE_CORRECTIONS, corrections);
    console.log(`[PostalCodeLookup] Imported ${Object.keys(corrections).length} corrections`);
  } catch (error) {
    console.error('[PostalCodeLookup] Failed to import corrections:', error);
    throw error;
  }
}
