/**
 * Federal MP Data Source
 * Fetches official MP data from House of Commons XML feed
 */

export interface FederalMP {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  honorific?: string;
  riding: string;
  province: string;
  party: string;
  startDate: string;
  endDate?: string;
  email?: string;
  photoUrl?: string;
  profileUrl?: string;
  // Contact info (if available from other sources)
  phone?: string;
  offices?: Array<{
    type: 'constituency' | 'hill';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
}

/**
 * Fetches all current MPs from the v3 API (uses bundled House of Commons data)
 * This avoids CORS issues and uses the server's bundled MP data
 */
export async function fetchHouseOfCommonsMPs(): Promise<FederalMP[]> {
  try {
    console.log('[FederalDataSource] Fetching MPs from v3 API...');

    const response = await fetch('/api/v3/representatives/all', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`v3 API fetch failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.representatives) {
      throw new Error('Invalid v3 API response');
    }

    // Convert v3 API format to FederalMP format
    const mps: FederalMP[] = data.representatives.map((rep: any) => ({
      id: rep.id,
      firstName: rep.firstName,
      lastName: rep.lastName,
      name: rep.name,
      honorific: rep.honorific,
      riding: rep.constituency,
      province: rep.province,
      party: rep.party,
      startDate: rep.fromDate || '',
      endDate: rep.toDate,
      email: rep.email,
      photoUrl: rep.photoUrl,
      profileUrl: rep.profileUrl,
      phone: rep.phone,
      offices: rep.offices?.map((office: any) => ({
        type: office.type === 'Hill' ? 'hill' : 'constituency',
        address: office.address,
        phone: office.phone,
        fax: office.fax,
      })),
    }));

    console.log(`[FederalDataSource] Successfully fetched ${mps.length} MPs from v3 API`);
    return mps;
  } catch (error) {
    console.error('[FederalDataSource] Failed to fetch MPs:', error);
    throw error;
  }
}


/**
 * Fetch detailed contact info for a specific MP by ID
 * Uses the v3 API which scrapes contact info on the server side
 */
export async function fetchMPContactInfo(mpId: string): Promise<{
  phone?: string;
  offices?: Array<{
    type: 'constituency' | 'hill';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
} | null> {
  try {
    console.log(`[FederalDataSource] Fetching contact info for MP ID: ${mpId}`);

    const response = await fetch(`/api/v3/representatives/${mpId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch MP details: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.representative) {
      return null;
    }

    const rep = data.representative;

    return {
      phone: rep.phone,
      offices: rep.offices?.map((office: any) => ({
        type: office.type === 'Hill' ? 'hill' : 'constituency',
        address: office.address,
        phone: office.phone,
        fax: office.fax,
      })),
    };
  } catch (error) {
    console.error(`[FederalDataSource] Failed to fetch contact info:`, error);
    return null;
  }
}
