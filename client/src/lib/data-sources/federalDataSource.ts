/**
 * Federal MP Data Source
 *
 * HYBRID APPROACH:
 * - Primary: OpenParliament API (detailed, official data)
 * - Secondary: Represent API (Open North) - fills missing contact/office info
 *
 * This file re-exports from the hybrid data source for backward compatibility.
 * All existing imports will continue to work.
 */

// Re-export types and functions from the hybrid data source
export type { FederalMP } from './hybridFederalDataSource';

export {
  fetchHouseOfCommonsMPs,
  searchMPsByName,
  fetchMPByRiding,
  getDataQualityStats,
} from './hybridFederalDataSource';

/**
 * Fetch detailed contact info for a specific MP
 * This uses the hybrid approach to ensure best data quality
 */
export async function fetchMPContactInfo(mpIdOrRiding: string): Promise<{
  phone?: string;
  fax?: string;
  offices?: Array<{
    type: 'constituency' | 'hill' | 'legislature';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
} | null> {
  try {
    console.log(`[FederalDataSource] Fetching contact info for: ${mpIdOrRiding}`);

    // Use hybrid approach to get MP with best available data
    const { fetchMPByRiding } = await import('./hybridFederalDataSource');
    const mp = await fetchMPByRiding(mpIdOrRiding);

    if (!mp) {
      return null;
    }

    return {
      phone: mp.phone,
      fax: mp.fax,
      offices: mp.offices,
    };

  } catch (error) {
    console.error(`[FederalDataSource] Failed to fetch contact info:`, error);
    return null;
  }
}
