/**
 * V2/V3 API Client
 * Now uses v3 bundled data API with offline-first architecture
 */

import type { Representative } from "@shared/schema";
import { makeRepresentativeId, __debugCheckRepId } from "../repId";

// V2 API response types
interface V2PostalCodeResponse {
  representative: {
    name: string;
    party: string;
    constituency: string;
    province: string;
    email?: string;
    phone?: string;
    photo?: string;
    offices: Array<{
      type: string;
      address?: string;
      phone?: string;
      fax?: string;
      email?: string;
    }>;
    parliamentId?: string;
    profileUrl?: string;
    boundaryUrl?: string;
    boundary?: {
      centroid?: { lat: number; lng: number };
      extent?: number[];
    };
    dataQuality: {
      source: string;
      confidence: string;
      warnings?: string[];
    };
  };
  lookup: {
    postalCode: string;
    riding: string;
    province: string;
    source: string;
    confidence: string;
  };
}

interface V2NameSearchResponse {
  representatives: Array<{
    name: string;
    party: string;
    constituency: string;
    province: string;
    email?: string;
    parliamentId?: string;
    profileUrl?: string;
  }>;
  count: number;
  source: string;
}

/**
 * Convert V2 API representative to internal Representative type
 */
async function toRepresentative(
  v2Rep: V2PostalCodeResponse['representative'] | V2NameSearchResponse['representatives'][0],
  boundaryUrl?: string
): Promise<Representative> {
  const id = await makeRepresentativeId({
    source: "v2-api",
    elected_office: "MP", // V2 API currently only returns MPs
    name: v2Rep.name,
    district_name: v2Rep.constituency,
    party_name: v2Rep.party,
    email: v2Rep.email,
  });

  const rep: Representative = {
    id: id as unknown as number, // Cast to number as schema expects it, but we use string internally
    name: v2Rep.name,
    party: v2Rep.party,
    constituency: v2Rep.constituency,
    province: v2Rep.province,
    electedOffice: "MP",
    email: v2Rep.email,
    phone: 'phone' in v2Rep ? v2Rep.phone : undefined,
    photo: 'photo' in v2Rep ? v2Rep.photo : undefined,
    website: 'profileUrl' in v2Rep ? v2Rep.profileUrl : undefined,
    personalWebsite: undefined,
    socialMedia: {},
    biography: null,
    offices: 'offices' in v2Rep ? v2Rep.offices : [],
    fax: 'offices' in v2Rep && v2Rep.offices?.[0]?.fax ? v2Rep.offices[0].fax : undefined,
    parliamentId: v2Rep.parliamentId,
    boundaryUrl: boundaryUrl || ('boundaryUrl' in v2Rep ? v2Rep.boundaryUrl : undefined),
    boundaryData: 'boundary' in v2Rep ? v2Rep.boundary : null,
    createdAt: undefined,
  } as unknown as Representative;

  __debugCheckRepId(rep.id as string);
  return rep;
}

/**
 * Search by postal code using V3 bundled data API
 * Uses: Bundled XML → Represent API for postal code lookup → Scraped contact info
 */
export async function fetchRepsByPostalV2(postalCode: string): Promise<Representative[]> {
  const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();

  console.log('[V3 API] Searching postal code:', cleanPostalCode);

  try {
    const response = await fetch('/api/v3/representatives/postal-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ postalCode: cleanPostalCode }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[V3 API] No representative found for postal code');
        return [];
      }
      throw new Error(`V3 API error: ${response.status} ${response.statusText}`);
    }

    const data: V2PostalCodeResponse = await response.json();
    console.log('[V3 API] Response data source:', data.representative.dataQuality);

    // Convert to internal Representative type
    const representative = await toRepresentative(
      data.representative,
      data.representative.boundaryUrl
    );

    return [representative];
  } catch (error) {
    console.error('[V3 API] Postal code search error:', error);
    throw error;
  }
}

/**
 * Search by name using V3 bundled data API
 * Uses: Bundled House of Commons XML
 */
export async function fetchRepsByNameV2(name: string): Promise<Representative[]> {
  console.log('[V3 API] Searching by name:', name);

  if (!name.trim()) {
    console.log('[V3 API] Empty query, returning empty array');
    return [];
  }

  try {
    const response = await fetch('/api/v3/representatives/search-name', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!response.ok) {
      throw new Error(`V3 API error: ${response.status} ${response.statusText}`);
    }

    const data: V2NameSearchResponse = await response.json();
    console.log('[V3 API] Found', data.count, 'representatives from', data.source);

    // Convert all representatives to internal type
    const representatives = await Promise.all(
      data.representatives.map((rep) => toRepresentative(rep))
    );

    return representatives;
  } catch (error) {
    console.error('[V3 API] Name search error:', error);
    throw error;
  }
}

/**
 * Get all current MPs using V3 bundled data API
 */
export async function fetchAllMPsV2(): Promise<Representative[]> {
  console.log('[V3 API] Fetching all MPs');

  try {
    const response = await fetch('/api/v3/representatives/all');

    if (!response.ok) {
      throw new Error(`V3 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[V3 API] Fetched', data.count, 'MPs');

    // Convert all to internal type
    const representatives = await Promise.all(
      data.representatives.map((rep: any) => toRepresentative(rep))
    );

    return representatives;
  } catch (error) {
    console.error('[V3 API] Fetch all MPs error:', error);
    throw error;
  }
}
