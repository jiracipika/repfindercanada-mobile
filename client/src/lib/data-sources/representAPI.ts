/**
 * Represent API Data Source (Open North)
 * Fetches federal MP data from https://represent.opennorth.ca
 * CORS-friendly alternative to House of Commons XML
 */

export interface RepresentOffice {
  type: 'legislature' | 'constituency';
  tel?: string;
  fax?: string;
  postal?: string;
  address?: string;
}

export interface RepresentMP {
  name: string;
  district_name: string;
  party_name: string;
  email?: string;
  url?: string;
  photo_url?: string;
  personal_url?: string;
  representative_set_name: string;
  elected_office: string;
  source_url?: string;
  offices?: RepresentOffice[];
  extra?: {
    twitter?: string;
    facebook?: string;
    roles?: string[];
  };
}

export interface RepresentAPIResponse {
  objects: RepresentMP[];
  meta: {
    next: string | null;
    previous: string | null;
    total_count: number;
    limit: number;
    offset: number;
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
  offices?: Array<{
    type: 'constituency' | 'hill' | 'legislature';
    address?: string;
    phone?: string;
    fax?: string;
  }>;
  social?: {
    twitter?: string;
    facebook?: string;
  };
}

/**
 * Fetches all current federal MPs from Represent API
 * Handles pagination automatically
 */
export async function fetchHouseOfCommonsMPs(): Promise<FederalMP[]> {
  try {
    console.log('[RepresentAPI] Fetching federal MPs from Open North...');

    const allMPs: RepresentMP[] = [];
    let nextUrl: string | null = 'https://represent.opennorth.ca/representatives/?representative_set=house-of-commons&limit=1000';

    // Fetch all pages
    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Represent API failed: ${response.status} ${response.statusText}`);
      }

      const data: RepresentAPIResponse = await response.json();

      console.log(`[RepresentAPI] Fetched ${data.objects.length} MPs (offset: ${data.meta.offset}, total: ${data.meta.total_count})`);

      allMPs.push(...data.objects);

      // Check if there's a next page
      nextUrl = data.meta.next;

      if (nextUrl && !nextUrl.startsWith('http')) {
        // Represent API returns relative URLs, make them absolute
        nextUrl = `https://represent.opennorth.ca${nextUrl}`;
      }
    }

    console.log(`[RepresentAPI] ✓ Successfully fetched ${allMPs.length} MPs from Represent API`);

    // Convert to our internal format
    const federalMPs = allMPs.map(convertToFederalMP);

    return federalMPs;

  } catch (error) {
    console.error('[RepresentAPI] Failed to fetch MPs:', error);
    throw error;
  }
}

/**
 * Convert Represent API format to our internal FederalMP format
 */
function convertToFederalMP(rep: RepresentMP): FederalMP {
  // Extract first and last name
  const nameParts = rep.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Generate a unique ID from the district name
  const id = generateIdFromDistrict(rep.district_name);

  // Extract province from district name (usually format: "District Name, Province")
  const province = extractProvince(rep.district_name);

  return {
    id,
    name: rep.name,
    firstName,
    lastName,
    riding: rep.district_name.split(',')[0].trim(), // Remove province from district name
    province,
    party: rep.party_name,
    email: rep.email,
    photoUrl: rep.photo_url,
    profileUrl: rep.url,
    personalUrl: rep.personal_url,
    phone: rep.offices?.[0]?.tel,
    offices: rep.offices?.map(office => ({
      type: office.type === 'legislature' ? 'hill' : 'constituency',
      address: office.address,
      phone: office.tel,
      fax: office.fax,
    })),
    social: {
      twitter: rep.extra?.twitter,
      facebook: rep.extra?.facebook,
    },
  };
}

/**
 * Generate a stable ID from district name
 */
function generateIdFromDistrict(districtName: string): string {
  return districtName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extract province from district name
 * Format: "District Name" or "District Name, Province"
 */
function extractProvince(districtName: string): string {
  const parts = districtName.split(',');
  if (parts.length > 1) {
    return parts[1].trim();
  }

  // Fallback: try to infer from district name patterns
  if (districtName.includes('—')) {
    // This might be a Quebec riding with em-dash
    return 'Quebec';
  }

  return 'Unknown';
}

/**
 * Fetch a specific MP by riding name
 */
export async function fetchMPByRiding(ridingName: string): Promise<FederalMP | null> {
  try {
    console.log(`[RepresentAPI] Fetching MP for riding: ${ridingName}`);

    const encodedRiding = encodeURIComponent(ridingName);
    const url = `https://represent.opennorth.ca/representatives/?representative_set=house-of-commons&district_name=${encodedRiding}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API failed: ${response.status}`);
    }

    const data: RepresentAPIResponse = await response.json();

    if (data.objects.length === 0) {
      console.log(`[RepresentAPI] No MP found for riding: ${ridingName}`);
      return null;
    }

    const mp = convertToFederalMP(data.objects[0]);
    console.log(`[RepresentAPI] ✓ Found MP: ${mp.name}`);

    return mp;

  } catch (error) {
    console.error(`[RepresentAPI] Failed to fetch MP for riding:`, error);
    return null;
  }
}

/**
 * Search MPs by name
 */
export async function searchMPsByName(name: string): Promise<FederalMP[]> {
  try {
    console.log(`[RepresentAPI] Searching MPs by name: ${name}`);

    const url = `https://represent.opennorth.ca/representatives/?representative_set=house-of-commons&name=${encodeURIComponent(name)}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API failed: ${response.status}`);
    }

    const data: RepresentAPIResponse = await response.json();

    const mps = data.objects.map(convertToFederalMP);
    console.log(`[RepresentAPI] ✓ Found ${mps.length} MPs matching "${name}"`);

    return mps;

  } catch (error) {
    console.error(`[RepresentAPI] Failed to search MPs:`, error);
    return [];
  }
}
