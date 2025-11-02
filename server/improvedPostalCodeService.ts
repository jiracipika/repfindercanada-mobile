/**
 * Improved Postal Code Service
 *
 * HYBRID POSTAL CODE LOOKUP
 * Combines Represent API (postal code→riding) with House of Commons XML (MP data)
 *
 * Data Flow:
 * 1. Postal code → Riding name (via Represent API, server-side)
 * 2. Riding name → MP data (via bundled House of Commons XML)
 * 3. Enrich with Represent API contact info if available
 *
 * Why this approach:
 * - Represent API: Best for postal code to riding mapping
 * - House of Commons XML: Official source of truth for MP data (DB Primary)
 * - Server-side fetching: No CORS issues
 */

import { getMPByRiding } from './bundledDataLoader';
import type { HouseOfCommonsMP } from './houseOfCommonsService';

interface RepresentAPIRepresentative {
  name: string;
  district_name: string;
  elected_office: string;
  party_name: string;
  email?: string;
  url?: string;
  photo_url?: string;
  offices?: Array<{
    type: string;
    tel?: string;
    fax?: string;
  }>;
}

interface PostalCodeLookupResult {
  mp: HouseOfCommonsMP | null;
  ridingName: string;
  province: string;
  source: 'bundled-data';
  representApiData?: RepresentAPIRepresentative;
  confidence: 'high' | 'low';
}

// In-memory cache for postal code lookups
const postalCodeCache = new Map<string, { result: PostalCodeLookupResult; timestamp: number }>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Normalize postal code (remove spaces, uppercase)
 */
function normalizePostalCode(postalCode: string): string {
  return postalCode.replace(/\s+/g, '').toUpperCase();
}

/**
 * Look up riding name from Represent API (Open North)
 */
async function lookupRidingFromRepresentAPI(postalCode: string): Promise<{
  ridingName: string;
  province: string;
  representData?: RepresentAPIRepresentative;
} | null> {
  try {
    console.log(`[PostalCodeService] Looking up postal code ${postalCode} via Represent API...`);

    // Add abort controller with 8 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `https://represent.opennorth.ca/postcodes/${encodeURIComponent(postalCode)}/`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[PostalCodeService] Represent API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Find the current federal MP
    const representatives = data.representatives_centroid || data.representatives_concordance || [];
    const federalMP = representatives.find((rep: any) =>
      rep.elected_office === 'MP' || rep.elected_office === 'Member of Parliament'
    );

    if (!federalMP) {
      console.warn('[PostalCodeService] No federal MP found in Represent API response');
      return null;
    }

    // Extract riding name and province
    const ridingName = federalMP.district_name;
    const province = federalMP.province || data.province || '';

    console.log(`[PostalCodeService] ✓ Found riding: ${ridingName}, ${province}`);

    return {
      ridingName,
      province,
      representData: federalMP,
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[PostalCodeService] Represent API timed out after 8 seconds');
    } else {
      console.error('[PostalCodeService] Represent API error:', error?.message || String(error));
    }
    return null;
  }
}

/**
 * Look up MP by postal code
 * Uses Represent API for postal code → riding, then bundled data for MP info
 */
export async function lookupMPByPostalCode(postalCode: string): Promise<PostalCodeLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);

  // Check cache first
  const cached = postalCodeCache.get(normalized);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[PostalCodeService] ✓ Returning cached result for ${normalized}`);
    return cached.result;
  }

  // Step 1: Look up riding from Represent API
  const ridingLookup = await lookupRidingFromRepresentAPI(normalized);

  if (!ridingLookup) {
    console.warn(`[PostalCodeService] Could not find riding for postal code ${normalized}`);
    return null;
  }

  // Step 2: Get MP from bundled data using riding name
  const mp = getMPByRiding(ridingLookup.ridingName);

  if (!mp) {
    console.warn(`[PostalCodeService] No MP found in bundled data for riding: ${ridingLookup.ridingName}`);

    // Return result with null MP but valid riding info
    const result: PostalCodeLookupResult = {
      mp: null,
      ridingName: ridingLookup.ridingName,
      province: ridingLookup.province,
      source: 'bundled-data',
      representApiData: ridingLookup.representData,
      confidence: 'low',
    };

    postalCodeCache.set(normalized, { result, timestamp: Date.now() });
    return result;
  }

  console.log(`[PostalCodeService] ✓ Found MP: ${mp.name} (${mp.party})`);

  // Step 3: Build result
  const result: PostalCodeLookupResult = {
    mp,
    ridingName: mp.constituency,
    province: mp.province,
    source: 'bundled-data',
    representApiData: ridingLookup.representData,
    confidence: 'high',
  };

  // Cache the result
  postalCodeCache.set(normalized, { result, timestamp: Date.now() });

  return result;
}

/**
 * Clear postal code cache
 */
export function clearPostalCodeCache() {
  postalCodeCache.clear();
  console.log('[PostalCodeService] Cache cleared');
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    size: postalCodeCache.size,
    entries: Array.from(postalCodeCache.keys()),
  };
}
