/**
 * Postal Code Lookup Service
 * Uses server API v2 with manual corrections for accurate riding lookups
 */

import type { FederalMP } from './data-sources/federalDataSource';

interface PostalCodeLookupResult {
  mp: FederalMP;
  riding: string;
  province: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'cache_manual' | 'represent_verified' | 'represent_unverified' | 'house_of_commons';
  warnings?: string[];
}

/**
 * NOTE: Postal code corrections are now managed server-side
 * Use the server API endpoint /api/v2/admin/postal-code-correction
 * to add new corrections
 */

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
 * NOTE: Direct Represent API calls removed
 * Server API now handles all postal code lookups with corrections
 */

/**
 * Main postal code lookup function
 * Uses server API v2 which has:
 * 1. Manual corrections for known inaccurate postal codes
 * 2. House of Commons XML as source of truth
 * 3. Represent API for postal code → riding mapping with verification
 */
export async function lookupByPostalCode(
  postalCode: string
): Promise<PostalCodeLookupResult | null> {
  const normalized = normalizePostalCode(postalCode);

  console.log(`[PostalCodeLookup] Looking up postal code via server API: ${normalized}`);

  try {
    const response = await fetch('/api/v2/representatives/postal-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postalCode: normalized }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[PostalCodeLookup] No representative found for ${normalized}`);
        return null;
      }
      throw new Error(`Server API failed: ${response.status}`);
    }

    const data = await response.json();
    const rep = data.representative;
    const lookup = data.lookup;

    if (!rep) {
      return null;
    }

    // Convert server response to FederalMP format
    const mp: FederalMP = {
      id: rep.parliamentId || rep.id || 'unknown',
      name: rep.name,
      firstName: rep.name.split(' ')[0] || '',
      lastName: rep.name.split(' ').slice(1).join(' ') || '',
      riding: rep.constituency,
      province: rep.province,
      party: rep.party,
      email: rep.email,
      phone: rep.phone,
      photoUrl: rep.photo,
      profileUrl: rep.profileUrl,
      offices: rep.offices,
      startDate: '',
      dataQuality: {
        source: lookup.source === 'cache_manual' ? 'house_of_commons+scraped' : 'house_of_commons',
        hasContactInfo: !!(rep.email || rep.phone),
        hasOfficeInfo: !!(rep.offices && rep.offices.length > 0),
        lastUpdated: new Date().toISOString(),
      },
    };

    console.log(
      `[PostalCodeLookup] ✓ Found MP: ${mp.name} (${mp.riding}) - ` +
      `Source: ${lookup.source}, Confidence: ${lookup.confidence}`
    );

    return {
      mp,
      riding: rep.constituency,
      province: rep.province,
      confidence: lookup.confidence,
      source: lookup.source,
      warnings: rep.dataQuality?.warnings || [],
    };

  } catch (error) {
    console.error(`[PostalCodeLookup] Server API lookup failed:`, error);
    return null;
  }
}

/**
 * Add a postal code correction
 * Submits correction to server for persistence
 */
export async function addPostalCodeCorrection(
  postalCode: string,
  riding: string,
  province: string,
  notes?: string
): Promise<boolean> {
  const normalized = normalizePostalCode(postalCode);

  try {
    const response = await fetch('/api/v2/admin/postal-code-correction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postalCode: normalized,
        ridingName: riding,
        province,
        notes: notes || 'User-reported correction',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save correction: ${response.status}`);
    }

    console.log(`[PostalCodeLookup] ✓ Correction saved: ${normalized} → ${riding}`);
    return true;
  } catch (error) {
    console.error('[PostalCodeLookup] Failed to save correction:', error);
    return false;
  }
}

/**
 * Get all postal code corrections from server
 */
export async function getPostalCodeCorrections(): Promise<any[]> {
  try {
    const response = await fetch('/api/v2/admin/postal-code-cache');
    if (!response.ok) {
      throw new Error(`Failed to get corrections: ${response.status}`);
    }
    const data = await response.json();
    return data.cache || [];
  } catch (error) {
    console.error('[PostalCodeLookup] Failed to get corrections:', error);
    return [];
  }
}

/**
 * Export corrections for sharing/backup
 */
export async function exportCorrections(): Promise<string> {
  try {
    const response = await fetch('/api/v2/admin/export-corrections');
    if (!response.ok) {
      throw new Error(`Failed to export corrections: ${response.status}`);
    }
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('[PostalCodeLookup] Failed to export corrections:', error);
    return JSON.stringify({ error: 'Failed to export' });
  }
}

/**
 * Import corrections from JSON
 */
export async function importCorrections(json: string): Promise<boolean> {
  try {
    const corrections = JSON.parse(json);
    const response = await fetch('/api/v2/admin/import-corrections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ corrections: corrections.corrections || corrections }),
    });

    if (!response.ok) {
      throw new Error(`Failed to import corrections: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[PostalCodeLookup] ✓ Imported ${result.imported} corrections`);
    return true;
  } catch (error) {
    console.error('[PostalCodeLookup] Failed to import corrections:', error);
    return false;
  }
}
