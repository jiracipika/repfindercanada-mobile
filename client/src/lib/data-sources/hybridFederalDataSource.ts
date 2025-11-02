/**
 * Hybrid Federal Data Source
 *
 * Strategy:
 * 1. PRIMARY: House of Commons XML (via server API) - Official MP data, no CORS issues
 * 2. SECONDARY: Server enriches with scraped contact info as needed
 *
 * This provides:
 * - Official House of Commons data (343 MPs as of 2023 Representation Order)
 * - Server-side fetching avoids CORS
 * - 24-hour caching for performance
 */

import type { HouseOfCommonsMP } from '../../../../server/houseOfCommonsService';

// Client-side FederalMP type (compatible with HouseOfCommonsMP)
export interface FederalMP {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  riding: string;
  province: string;
  party: string;
  email?: string;
  photoUrl?: string;
  profileUrl?: string;
  personalUrl?: string;
  phone?: string;
  fax?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
  offices?: Array<{
    type: 'constituency' | 'hill' | 'legislature';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
  social?: {
    twitter?: string;
    facebook?: string;
    website?: string;
  };
  // Data quality metadata
  dataQuality: {
    source: 'house_of_commons' | 'house_of_commons+scraped';
    hasContactInfo: boolean;
    hasOfficeInfo: boolean;
    lastUpdated: string;
  };
}

/**
 * Fetches all current federal MPs from server
 *
 * Process:
 * 1. Call server API /api/v2/representatives/all
 * 2. Server fetches from House of Commons XML (no CORS)
 * 3. Server caches for 24 hours
 * 4. Transform to client format
 */
export async function fetchHouseOfCommonsMPs(): Promise<FederalMP[]> {
  try {
    console.log('[HybridDataSource] Fetching MPs from server API...');

    const response = await fetch('/api/v2/representatives/all');

    if (!response.ok) {
      throw new Error(`Server API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.representatives || !Array.isArray(data.representatives)) {
      throw new Error('Invalid response format from server');
    }

    console.log(`[HybridDataSource] ✓ Received ${data.count} MPs from server (source: ${data.source})`);

    // Convert HouseOfCommonsMP format to FederalMP format
    const federalMPs: FederalMP[] = data.representatives.map((mp: HouseOfCommonsMP) => ({
      id: mp.id,
      name: mp.name,
      firstName: mp.firstName,
      lastName: mp.lastName,
      riding: mp.constituency, // HouseOfCommons uses "constituency"
      province: mp.province,
      party: mp.party,
      email: mp.email,
      photoUrl: mp.photoUrl,
      profileUrl: mp.profileUrl,
      startDate: mp.fromDate,
      endDate: mp.toDate,
      dataQuality: {
        source: 'house_of_commons',
        hasContactInfo: !!mp.email,
        hasOfficeInfo: false, // Office info requires scraping
        lastUpdated: new Date().toISOString(),
      },
    }));

    console.log(`[HybridDataSource] ✓ Transformed ${federalMPs.length} MPs to client format`);

    return federalMPs;

  } catch (error) {
    console.error('[HybridDataSource] Failed to fetch MPs from server:', error);
    throw error;
  }
}

/**
 * Normalize riding name for comparison
 */
function normalizeRidingName(riding: string): string {
  return riding
    .toLowerCase()
    .replace(/[—–-]/g, '-') // Normalize dashes
    .replace(/[^a-z0-9-]/g, '')
    .trim();
}

/**
 * Normalize name for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Search MPs by name using server API
 */
export async function searchMPsByName(name: string): Promise<FederalMP[]> {
  try {
    console.log(`[HybridDataSource] Searching for: ${name}`);

    const response = await fetch('/api/v2/representatives/search-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error(`Server API failed: ${response.status}`);
    }

    const data = await response.json();

    // Convert to FederalMP format
    const results: FederalMP[] = (data.representatives || []).map((mp: any) => ({
      id: mp.parliamentId || mp.id,
      name: mp.name,
      firstName: mp.name.split(' ')[0] || '',
      lastName: mp.name.split(' ').slice(1).join(' ') || '',
      riding: mp.constituency,
      province: mp.province,
      party: mp.party,
      email: mp.email,
      profileUrl: mp.profileUrl,
      dataQuality: {
        source: 'house_of_commons',
        hasContactInfo: !!mp.email,
        hasOfficeInfo: false,
        lastUpdated: new Date().toISOString(),
      },
    }));

    console.log(`[HybridDataSource] ✓ Found ${results.length} results`);
    return results;

  } catch (error) {
    console.error('[HybridDataSource] Search failed:', error);
    return [];
  }
}

/**
 * Find MP by riding using server API
 */
export async function fetchMPByRiding(ridingName: string): Promise<FederalMP | null> {
  try {
    console.log(`[HybridDataSource] Looking up riding: ${ridingName}`);

    const response = await fetch(`/api/v2/representatives/riding/${encodeURIComponent(ridingName)}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[HybridDataSource] No MP found for riding: ${ridingName}`);
        return null;
      }
      throw new Error(`Server API failed: ${response.status}`);
    }

    const data = await response.json();
    const mp = data.representative;

    if (!mp) {
      return null;
    }

    // Convert to FederalMP format
    const federalMP: FederalMP = {
      id: mp.id,
      name: mp.name,
      firstName: mp.firstName,
      lastName: mp.lastName,
      riding: mp.constituency,
      province: mp.province,
      party: mp.party,
      email: mp.email,
      phone: mp.phone,
      photoUrl: mp.photoUrl,
      profileUrl: mp.profileUrl,
      offices: mp.offices || [],
      startDate: mp.fromDate,
      endDate: mp.toDate,
      dataQuality: {
        source: mp.offices?.length > 0 ? 'house_of_commons+scraped' : 'house_of_commons',
        hasContactInfo: !!(mp.email || mp.phone),
        hasOfficeInfo: !!(mp.offices && mp.offices.length > 0),
        lastUpdated: new Date().toISOString(),
      },
    };

    console.log(`[HybridDataSource] ✓ Found ${federalMP.name}`);
    return federalMP;

  } catch (error) {
    console.error('[HybridDataSource] Riding lookup failed:', error);
    return null;
  }
}

/**
 * Get data quality statistics
 */
export async function getDataQualityStats(mps: FederalMP[]): Promise<{
  total: number;
  fromOpenParliament: number;
  enrichedWithRepresent: number;
  withContactInfo: number;
  withOfficeInfo: number;
  completionRate: number;
}> {
  const total = mps.length;
  const fromOpenParliament = mps.filter(mp => mp.dataQuality.source === 'openparliament').length;
  const enrichedWithRepresent = mps.filter(mp => mp.dataQuality.source === 'openparliament+represent').length;
  const withContactInfo = mps.filter(mp => mp.dataQuality.hasContactInfo).length;
  const withOfficeInfo = mps.filter(mp => mp.dataQuality.hasOfficeInfo).length;
  const completionRate = ((withContactInfo + withOfficeInfo) / (total * 2)) * 100;

  return {
    total,
    fromOpenParliament,
    enrichedWithRepresent,
    withContactInfo,
    withOfficeInfo,
    completionRate,
  };
}
