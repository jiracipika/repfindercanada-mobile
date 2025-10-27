/**
 * Hybrid Federal Data Source
 *
 * Strategy:
 * 1. PRIMARY: OpenParliament API - Detailed MP information from official sources
 * 2. SECONDARY: Represent API (Open North) - Fill in missing contact/office info
 *
 * This provides the best of both worlds:
 * - OpenParliament: More detailed, official data
 * - Represent API: Better office/contact information
 */

import {
  fetchOpenParliamentMPs,
  fetchMPDetails,
  type FederalMP as OpenParliamentMP,
} from './openParliamentAPI';

import {
  fetchHouseOfCommonsMPs as fetchRepresentMPs,
  type FederalMP as RepresentMP,
} from './representAPI';

export type FederalMP = OpenParliamentMP;

/**
 * Fetches all current federal MPs using hybrid approach
 *
 * Process:
 * 1. Fetch from OpenParliament (primary source)
 * 2. For MPs missing contact info, enrich with Represent API data
 * 3. Return merged dataset with quality indicators
 */
export async function fetchHouseOfCommonsMPs(): Promise<FederalMP[]> {
  try {
    console.log('[HybridDataSource] Starting hybrid MP data fetch...');
    console.log('[HybridDataSource] Step 1/3: Fetching from OpenParliament (primary)...');

    // Step 1: Get MPs from OpenParliament
    const openParliamentMPs = await fetchOpenParliamentMPs();
    console.log(`[HybridDataSource] ✓ OpenParliament returned ${openParliamentMPs.length} MPs`);

    // Step 2: Check data quality and identify gaps
    const mpsWithGaps = openParliamentMPs.filter(mp =>
      !mp.dataQuality.hasContactInfo || !mp.dataQuality.hasOfficeInfo
    );

    console.log(`[HybridDataSource] Found ${mpsWithGaps.length} MPs with missing contact/office info`);

    if (mpsWithGaps.length === 0) {
      console.log('[HybridDataSource] ✓ All MPs have complete data from OpenParliament');
      return openParliamentMPs;
    }

    // Step 3: Fetch from Represent API as fallback
    console.log('[HybridDataSource] Step 2/3: Fetching from Represent API (secondary)...');

    let representMPs: RepresentMP[] = [];
    try {
      representMPs = await fetchRepresentMPs();
      console.log(`[HybridDataSource] ✓ Represent API returned ${representMPs.length} MPs`);
    } catch (error) {
      console.warn('[HybridDataSource] Represent API fetch failed, using OpenParliament data only:', error);
      return openParliamentMPs;
    }

    // Step 4: Merge data - enrich OpenParliament with Represent API
    console.log('[HybridDataSource] Step 3/3: Merging data sources...');

    const enrichedMPs = openParliamentMPs.map(opMP => {
      // Find matching MP in Represent API data
      const representMP = representMPs.find(rMP =>
        normalizeRidingName(rMP.riding) === normalizeRidingName(opMP.riding) ||
        normalizeName(rMP.name) === normalizeName(opMP.name)
      );

      if (!representMP) {
        return opMP; // No match, return as-is
      }

      // Check if OpenParliament MP needs enrichment
      const needsEnrichment = !opMP.dataQuality.hasContactInfo || !opMP.dataQuality.hasOfficeInfo;

      if (!needsEnrichment) {
        return opMP; // Already has complete data
      }

      // Merge data, preferring OpenParliament but filling gaps with Represent
      const enriched: FederalMP = {
        ...opMP,
        // Fill missing contact info
        email: opMP.email || representMP.email,
        phone: opMP.phone || representMP.phone,
        // Fill missing office info
        offices: opMP.offices && opMP.offices.length > 0
          ? opMP.offices
          : representMP.offices,
        // Fill missing social media
        social: {
          twitter: opMP.social?.twitter || representMP.social?.twitter,
          facebook: opMP.social?.facebook || representMP.social?.facebook,
          website: opMP.social?.website || representMP.personalUrl,
        },
        // Update data quality
        dataQuality: {
          source: 'openparliament+represent',
          hasContactInfo: !!(opMP.email || representMP.email || opMP.phone || representMP.phone),
          hasOfficeInfo: !!((opMP.offices && opMP.offices.length > 0) || (representMP.offices && representMP.offices.length > 0)),
          lastUpdated: new Date().toISOString(),
        },
      };

      console.log(`[HybridDataSource] ✓ Enriched ${opMP.name} with Represent API data`);
      return enriched;
    });

    const enrichedCount = enrichedMPs.filter(mp => mp.dataQuality.source === 'openparliament+represent').length;
    console.log(`[HybridDataSource] ✓ Enriched ${enrichedCount} MPs with Represent API data`);
    console.log(`[HybridDataSource] ✓ Final dataset: ${enrichedMPs.length} MPs`);

    return enrichedMPs;

  } catch (error) {
    console.error('[HybridDataSource] Hybrid fetch failed:', error);
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
 * Search MPs by name (uses OpenParliament primarily)
 */
export async function searchMPsByName(name: string): Promise<FederalMP[]> {
  try {
    console.log(`[HybridDataSource] Searching for: ${name}`);

    // Import search function from OpenParliament
    const { searchMPsByName: opSearch } = await import('./openParliamentAPI');
    const results = await opSearch(name);

    console.log(`[HybridDataSource] ✓ Found ${results.length} results from OpenParliament`);
    return results;

  } catch (error) {
    console.error('[HybridDataSource] Search failed:', error);
    return [];
  }
}

/**
 * Find MP by riding (uses OpenParliament primarily)
 */
export async function fetchMPByRiding(ridingName: string): Promise<FederalMP | null> {
  try {
    console.log(`[HybridDataSource] Looking up riding: ${ridingName}`);

    // Import function from OpenParliament
    const { fetchMPByRiding: opFetch } = await import('./openParliamentAPI');
    const mp = await opFetch(ridingName);

    if (mp) {
      console.log(`[HybridDataSource] ✓ Found ${mp.name} from OpenParliament`);

      // If missing contact info, try to enrich with Represent API
      if (!mp.dataQuality.hasContactInfo || !mp.dataQuality.hasOfficeInfo) {
        console.log(`[HybridDataSource] Attempting to enrich ${mp.name} with Represent API...`);

        try {
          const { fetchMPByRiding: representFetch } = await import('./representAPI');
          const representMP = await representFetch(ridingName);

          if (representMP) {
            return {
              ...mp,
              email: mp.email || representMP.email,
              phone: mp.phone || representMP.phone,
              offices: mp.offices && mp.offices.length > 0 ? mp.offices : representMP.offices,
              dataQuality: {
                source: 'openparliament+represent',
                hasContactInfo: !!(mp.email || representMP.email || mp.phone || representMP.phone),
                hasOfficeInfo: !!((mp.offices && mp.offices.length > 0) || (representMP.offices && representMP.offices.length > 0)),
                lastUpdated: new Date().toISOString(),
              },
            };
          }
        } catch (error) {
          console.warn('[HybridDataSource] Represent API enrichment failed, using OpenParliament data only');
        }
      }
    }

    return mp;

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
