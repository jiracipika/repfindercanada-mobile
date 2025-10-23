/**
 * Hybrid Postal Code Lookup Service
 * Combines multiple data sources for improved accuracy:
 * 1. Database cache (with manual corrections)
 * 2. Represent API
 * 3. House of Commons verification
 */

import { getAllMPsFromHouseOfCommons, getMPByRiding } from './houseOfCommonsService';
import type { PostalCodeCache, InsertPostalCodeCache } from '@shared/schema';

interface PostalCodeLookupResult {
  postalCode: string;
  ridingName: string;
  province: string;
  mpName?: string;
  party?: string;
  source: 'cache' | 'cache_manual' | 'represent_verified' | 'represent_unverified';
  confidence: 'high' | 'medium' | 'low';
  boundaryUrl?: string;
  warnings?: string[];
}

// In-memory cache for postal code lookups
// In production, this would be replaced with database queries
const postalCodeMemCache = new Map<string, PostalCodeCache>();

/**
 * Normalizes postal code to standard format (remove spaces, uppercase)
 */
export function normalizePostalCode(postalCode: string): string {
  return postalCode.replace(/\s+/g, '').toUpperCase();
}

/**
 * Checks cache for postal code lookup
 */
export async function checkPostalCodeCache(postalCode: string): Promise<PostalCodeLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);
  const cached = postalCodeMemCache.get(normalized);

  if (!cached) {
    return null;
  }

  // Check if cache is stale (older than 30 days)
  const age = Date.now() - (cached.lastVerified?.getTime() || 0);
  const isStale = age > 30 * 24 * 60 * 60 * 1000; // 30 days

  if (isStale && !cached.manualOverride) {
    // Cache is stale and not manually verified, don't use it
    return null;
  }

  return {
    postalCode: normalized,
    ridingName: cached.ridingName,
    province: cached.province,
    source: cached.manualOverride ? 'cache_manual' : 'cache',
    confidence: cached.confidence as 'high' | 'medium' | 'low' || 'medium',
    boundaryUrl: cached.boundaryUrl || undefined,
  };
}

/**
 * Saves postal code lookup result to cache
 */
export async function saveToPostalCodeCache(result: PostalCodeLookupResult): Promise<void> {
  const normalized = normalizePostalCode(result.postalCode);

  const cacheEntry: PostalCodeCache = {
    id: postalCodeMemCache.size + 1,
    postalCode: normalized,
    ridingName: result.ridingName,
    province: result.province,
    source: result.source,
    confidence: result.confidence,
    manualOverride: result.source === 'cache_manual',
    boundaryUrl: result.boundaryUrl || null,
    lastVerified: new Date(),
    notes: result.warnings?.join('; ') || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  postalCodeMemCache.set(normalized, cacheEntry);
}

/**
 * Looks up riding from Represent API
 */
async function lookupFromRepresentAPI(postalCode: string): Promise<{
  ridingName: string;
  province: string;
  boundaryUrl?: string;
  representatives: any[];
} | null> {
  try {
    const cleanPostalCode = normalizePostalCode(postalCode);
    console.log(`Looking up postal code ${cleanPostalCode} via Represent API`);

    const response = await fetch(`https://represent.opennorth.ca/postcodes/${cleanPostalCode}/`, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status}`);
    }

    const data = await response.json();
    const representatives = data.representatives_centroid || data.representatives_concordance || [];

    // Filter for current MPs
    const currentMPs = representatives.filter((rep: any) =>
      rep.elected_office === 'MP' && rep.incumbent === true
    );

    if (currentMPs.length === 0) {
      console.log(`No current MPs found for postal code ${cleanPostalCode}`);
      return null;
    }

    // Get the first current MP
    const mp = currentMPs[0];

    return {
      ridingName: mp.district_name,
      province: data.province || 'Unknown',
      boundaryUrl: mp.representative_set_name ? `/boundaries/${mp.representative_set_name}/${mp.district_name}/` : undefined,
      representatives: currentMPs,
    };
  } catch (error: any) {
    console.error(`Represent API lookup failed for ${postalCode}:`, error?.message || String(error));
    return null;
  }
}

/**
 * Verifies riding data against House of Commons official data
 */
async function verifyWithHouseOfCommons(ridingName: string): Promise<{
  verified: boolean;
  mpName?: string;
  party?: string;
  warnings?: string[];
}> {
  try {
    const officialMP = await getMPByRiding(ridingName);

    if (!officialMP) {
      return {
        verified: false,
        warnings: [`Riding "${ridingName}" not found in House of Commons data`],
      };
    }

    return {
      verified: true,
      mpName: officialMP.name,
      party: officialMP.party,
    };
  } catch (error: any) {
    console.error(`House of Commons verification failed:`, error?.message || String(error));
    return {
      verified: false,
      warnings: ['Could not verify with House of Commons'],
    };
  }
}

/**
 * Main hybrid postal code lookup function
 * Uses cache → Represent API → House of Commons verification
 */
export async function lookupPostalCode(postalCode: string): Promise<PostalCodeLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);

  // Step 1: Check cache
  const cached = await checkPostalCodeCache(normalized);
  if (cached) {
    console.log(`Using cached result for ${normalized} (source: ${cached.source})`);
    return cached;
  }

  // Step 2: Look up from Represent API
  const representResult = await lookupFromRepresentAPI(normalized);
  if (!representResult) {
    return null;
  }

  // Step 3: Verify with House of Commons
  const verification = await verifyWithHouseOfCommons(representResult.ridingName);

  const result: PostalCodeLookupResult = {
    postalCode: normalized,
    ridingName: representResult.ridingName,
    province: representResult.province,
    mpName: verification.mpName,
    party: verification.party,
    source: verification.verified ? 'represent_verified' : 'represent_unverified',
    confidence: verification.verified ? 'high' : 'medium',
    boundaryUrl: representResult.boundaryUrl,
    warnings: verification.warnings,
  };

  // Save to cache for future lookups
  await saveToPostalCodeCache(result);

  return result;
}

/**
 * Manually corrects a postal code to riding mapping
 * Used to fix known inaccuracies, especially near riding boundaries
 */
export async function correctPostalCodeMapping(
  postalCode: string,
  ridingName: string,
  province: string,
  notes?: string
): Promise<PostalCodeLookupResult> {
  const normalized = normalizePostalCode(postalCode);

  // Verify the riding exists in House of Commons data
  const verification = await verifyWithHouseOfCommons(ridingName);

  const result: PostalCodeLookupResult = {
    postalCode: normalized,
    ridingName,
    province,
    mpName: verification.mpName,
    party: verification.party,
    source: 'cache_manual',
    confidence: 'high',
    warnings: verification.warnings,
  };

  // Save manual correction to cache
  await saveToPostalCodeCache(result);

  // In production, this would also save to database with notes
  console.log(`Manual correction saved for ${normalized} → ${ridingName}${notes ? ` (${notes})` : ''}`);

  return result;
}

/**
 * Batch lookup for multiple postal codes
 * Useful for validating or migrating data
 */
export async function lookupPostalCodesBatch(postalCodes: string[]): Promise<PostalCodeLookupResult[]> {
  const results: PostalCodeLookupResult[] = [];

  for (const postalCode of postalCodes) {
    const result = await lookupPostalCode(postalCode);
    if (result) {
      results.push(result);
    }

    // Add delay to respect rate limits (60/min = 1/second)
    if (postalCodes.indexOf(postalCode) < postalCodes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Get all cached postal codes (for admin/debugging)
 */
export function getAllCachedPostalCodes(): PostalCodeCache[] {
  return Array.from(postalCodeMemCache.values());
}

/**
 * Clear postal code cache (for testing)
 */
export function clearPostalCodeCache(): void {
  postalCodeMemCache.clear();
}
