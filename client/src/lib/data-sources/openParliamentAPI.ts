/**
 * OpenParliament API Data Source
 * Primary source for Canadian parliamentary data
 * Source: https://api.openparliament.ca
 *
 * Uses JSON API, pulls from official government sources
 * More detailed than Represent API but may have gaps in contact info
 */

export interface OpenParliamentMember {
  name: string;
  riding_name: string;
  party_name: string;
  member_url: string;
  url: string;
  image?: string;
  email?: string;
  constituency?: string;
  province?: string;
  start_date?: string;
  end_date?: string | null;
  gender?: string;
  // Additional fields from detail endpoint
  phone?: string;
  fax?: string;
  offices?: Array<{
    type: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    tel?: string;
    fax?: string;
  }>;
  extra?: {
    twitter?: string;
    facebook?: string;
    website?: string;
  };
}

export interface OpenParliamentAPIResponse {
  objects: OpenParliamentMember[];
  pagination: {
    page: number;
    per_page: number;
    count: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

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
    source: 'openparliament' | 'openparliament+represent';
    hasContactInfo: boolean;
    hasOfficeInfo: boolean;
    lastUpdated: string;
  };
}

/**
 * Fetches current MPs from OpenParliament API
 * This is the primary data source - provides detailed MP information
 */
export async function fetchOpenParliamentMPs(): Promise<FederalMP[]> {
  try {
    console.log('[OpenParliament] Fetching MPs from OpenParliament API...');

    const allMembers: OpenParliamentMember[] = [];
    let page = 1;
    let hasNext = true;

    // Fetch all pages of current MPs
    while (hasNext) {
      const url = `https://api.openparliament.ca/politicians/?limit=100&offset=${(page - 1) * 100}&current=true`;

      console.log(`[OpenParliament] Fetching page ${page}...`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenParliament API failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // OpenParliament structure: { objects: [...], pagination: {...} }
      if (!data.objects) {
        console.warn('[OpenParliament] Unexpected API response structure');
        break;
      }

      allMembers.push(...data.objects);

      console.log(`[OpenParliament] Page ${page}: fetched ${data.objects.length} members (total so far: ${allMembers.length})`);

      // Check if there's more data
      hasNext = data.pagination?.has_next || false;
      page++;

      // Safety limit to prevent infinite loops
      if (page > 10) {
        console.warn('[OpenParliament] Reached page limit, stopping pagination');
        break;
      }
    }

    console.log(`[OpenParliament] ✓ Successfully fetched ${allMembers.length} MPs`);

    // Convert to our internal format
    const federalMPs = allMembers.map(convertToFederalMP);

    return federalMPs;

  } catch (error) {
    console.error('[OpenParliament] Failed to fetch MPs:', error);
    throw error;
  }
}

/**
 * Fetch detailed information for a specific MP
 * OpenParliament provides more details at the individual MP endpoint
 */
export async function fetchMPDetails(mpUrl: string): Promise<Partial<FederalMP> | null> {
  try {
    console.log(`[OpenParliament] Fetching details from: ${mpUrl}`);

    const response = await fetch(mpUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[OpenParliament] Failed to fetch MP details: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      phone: data.phone,
      fax: data.fax,
      email: data.email,
      offices: data.offices?.map((office: any) => ({
        type: office.type?.toLowerCase().includes('hill') ? 'hill' : 'constituency',
        address: office.address,
        city: office.city,
        province: office.province,
        postalCode: office.postal_code,
        phone: office.tel,
        fax: office.fax,
      })),
      social: {
        twitter: data.extra?.twitter,
        facebook: data.extra?.facebook,
        website: data.extra?.website,
      },
    };

  } catch (error) {
    console.error(`[OpenParliament] Failed to fetch MP details:`, error);
    return null;
  }
}

/**
 * Convert OpenParliament format to our internal FederalMP format
 */
function convertToFederalMP(member: OpenParliamentMember): FederalMP {
  // Extract first and last name
  const nameParts = member.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Generate ID from riding name
  const id = generateIdFromRiding(member.riding_name);

  // Extract province from riding name if not provided
  const province = member.province || extractProvinceFromRiding(member.riding_name);

  // Check data quality
  const hasContactInfo = !!(member.email || member.phone);
  const hasOfficeInfo = !!(member.offices && member.offices.length > 0);

  return {
    id,
    name: member.name,
    firstName,
    lastName,
    riding: member.riding_name,
    province,
    party: member.party_name,
    email: member.email,
    photoUrl: member.image,
    profileUrl: member.url,
    personalUrl: member.extra?.website,
    phone: member.phone,
    fax: member.fax,
    gender: member.gender,
    startDate: member.start_date,
    endDate: member.end_date || undefined,
    offices: member.offices?.map(office => ({
      type: office.type?.toLowerCase().includes('hill') ? 'hill' : 'constituency',
      address: office.address,
      city: office.city,
      province: office.province,
      postalCode: office.postal_code,
      phone: office.tel,
      fax: office.fax,
    })),
    social: {
      twitter: member.extra?.twitter,
      facebook: member.extra?.facebook,
      website: member.extra?.website,
    },
    dataQuality: {
      source: 'openparliament',
      hasContactInfo,
      hasOfficeInfo,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Generate a stable ID from riding name
 */
function generateIdFromRiding(ridingName: string): string {
  return ridingName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract province from riding name
 * Some riding names include province info
 */
function extractProvinceFromRiding(ridingName: string): string {
  const provincePatterns = {
    'AB': 'Alberta',
    'BC': 'British Columbia',
    'MB': 'Manitoba',
    'NB': 'New Brunswick',
    'NL': 'Newfoundland and Labrador',
    'NT': 'Northwest Territories',
    'NS': 'Nova Scotia',
    'NU': 'Nunavut',
    'ON': 'Ontario',
    'PE': 'Prince Edward Island',
    'QC': 'Quebec',
    'SK': 'Saskatchewan',
    'YT': 'Yukon',
  };

  // Check if riding name contains province abbreviation
  for (const [abbr, fullName] of Object.entries(provincePatterns)) {
    if (ridingName.includes(abbr) || ridingName.includes(fullName)) {
      return fullName;
    }
  }

  return 'Unknown';
}

/**
 * Search MPs by name
 */
export async function searchMPsByName(name: string): Promise<FederalMP[]> {
  try {
    console.log(`[OpenParliament] Searching MPs by name: ${name}`);

    const url = `https://api.openparliament.ca/politicians/?name=${encodeURIComponent(name)}&current=true&limit=50`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenParliament API failed: ${response.status}`);
    }

    const data = await response.json();

    const mps = data.objects.map(convertToFederalMP);
    console.log(`[OpenParliament] ✓ Found ${mps.length} MPs matching "${name}"`);

    return mps;

  } catch (error) {
    console.error(`[OpenParliament] Failed to search MPs:`, error);
    return [];
  }
}

/**
 * Find MP by riding name
 */
export async function fetchMPByRiding(ridingName: string): Promise<FederalMP | null> {
  try {
    console.log(`[OpenParliament] Fetching MP for riding: ${ridingName}`);

    const url = `https://api.openparliament.ca/politicians/?riding=${encodeURIComponent(ridingName)}&current=true`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenParliament API failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.objects || data.objects.length === 0) {
      console.log(`[OpenParliament] No MP found for riding: ${ridingName}`);
      return null;
    }

    const mp = convertToFederalMP(data.objects[0]);
    console.log(`[OpenParliament] ✓ Found MP: ${mp.name}`);

    return mp;

  } catch (error) {
    console.error(`[OpenParliament] Failed to fetch MP for riding:`, error);
    return null;
  }
}
