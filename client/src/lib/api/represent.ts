import type { Representative } from "@shared/schema";
import { makeRepresentativeId, __debugCheckRepId } from "../repId";

interface OpenNorthRepresentative {
  name: string;
  elected_office: string;
  district_name: string;
  party_name: string;
  email: string;
  personal_url: string;
  photo_url: string;
  offices: { type: string; tel: string; fax?: string }[];
  url?: string; // Sometimes available
}

const normalizeRepresentative = async (rep: OpenNorthRepresentative): Promise<Representative> => {
  // Create a stable, deterministic ID based on representative's key fields
  const id = await makeRepresentativeId({
    source: "opennorth-search",
    elected_office: rep.elected_office,
    name: rep.name,
    district_name: rep.district_name,
    party_name: rep.party_name,
    email: rep.email,
  });

  const representative: Representative = {
    id: id as any, // Cast to any because the schema expects number, but we're generating string for now
    name: rep.name,
    party: rep.party_name || "Independent",
    constituency: rep.district_name,
    province: "", // Not provided by this OpenNorth endpoint
    electedOffice: rep.elected_office || undefined,
    email: rep.email || undefined,
    phone: rep.offices?.[0]?.tel || undefined,
    photo: rep.photo_url || undefined,
    website: rep.url || rep.personal_url || undefined,
    personalWebsite: rep.personal_url || undefined,
    socialMedia: {}, // Not provided by this OpenNorth endpoint
    biography: null,
    offices: rep.offices || [],
    fax: rep.offices?.[0]?.fax || undefined,
    parliamentId: undefined, // Not provided by this OpenNorth endpoint
    createdAt: undefined,
  };

  __debugCheckRepId(representative.id as string);
  return representative;
};

export const searchByName = async (name: string): Promise<Representative[]> => {
  console.log('[searchByName] === Starting name search ===');
  console.log('[searchByName] Query:', name);

  if (!name.trim()) {
    console.log('[searchByName] Empty query, returning empty array');
    return [];
  }

  try {
    const url = `https://represent.opennorth.ca/representatives/?q=${encodeURIComponent(name)}`;
    console.log('[searchByName] Fetching from URL:', url);

    const response = await fetch(url);
    console.log('[searchByName] Response status:', response.status);
    console.log('[searchByName] Response ok:', response.ok);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[searchByName] Raw API response:', JSON.stringify(data).substring(0, 500) + '...');
    console.log('[searchByName] Number of objects returned:', data?.objects?.length || 0);

    // OpenNorth API returns a 'objects' array
    if (data && Array.isArray(data.objects)) {
      // Trust the API's filtering - it already filtered by the 'q' parameter
      // The API searches across multiple fields (name, district, office, etc.)
      console.log('[searchByName] Using API results directly (trusting API filtering)');

      const representatives = await Promise.all(data.objects.map((rep: OpenNorthRepresentative) => normalizeRepresentative(rep)));
      console.log('[searchByName] After normalization:', representatives.length, 'representatives');
      console.log('[searchByName] First result (if any):', representatives[0] ? JSON.stringify(representatives[0]).substring(0, 300) : 'none');

      return representatives;
    }
    console.log('[searchByName] No objects array in response, returning empty array');
    return [];
  } catch (error) {
    console.error('[searchByName] !!! Error searching by name:', error);
    console.error('[searchByName] !!! Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // In a real app, you might want to throw a more specific error or return a Result type
    return [];
  }
};
