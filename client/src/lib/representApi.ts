import type { Representative } from "@shared/types";
import { searchByName } from "./api/represent";
import { makeRepresentativeId, __debugCheckRepId } from "./repId";
import { searchCacheRepository } from "./storage/searchCacheRepository";

interface OpenNorthRepresentative {
  name: string;
  district_name: string;
  province?: string;
  party_name?: string;
  email?: string;
  url?: string;
  photo_url?: string;
  personal_url?: string;
  offices?: Array<{
    postal?: string;
    tel?: string;
    fax?: string;
    type?: string;
  }>;
  elected_office: string;
  district_id?: number;
  extra?: Record<string, any>;
  related?: {
    boundary_url?: string;
  };
}

interface OpenNorthBoundary {
  url: string;
  name: string;
  boundary_set_name: string;
  external_id?: string;
}

/**
 * Convert raw result from Represent API to our internal Representative shape.
 */
async function toRepresentative(raw: OpenNorthRepresentative, boundaryUrl?: string): Promise<Representative> {
  const id = await makeRepresentativeId({
    source: "opennorth-postal",
    elected_office: raw.elected_office,
    name: raw.name,
    district_name: raw.district_name,
    ocd_id: raw.district_id ? String(raw.district_id) : undefined,
    party_name: raw.party_name,
    email: raw.email,
  });

  const rep: Representative = {
    id: id as any, // Cast to any as schema expects number, but we use string for mobile-only build
    name: raw.name,
    party: raw.party_name ?? "Independent",
    constituency: raw.district_name,
    province: raw.province ?? "",
    electedOffice: raw.elected_office ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.offices?.[0]?.tel ?? undefined,
    photo: raw.photo_url ?? undefined,
    website: raw.url ?? undefined,
    personalWebsite: raw.personal_url ?? undefined,
    socialMedia: raw.extra ?? {},
    biography: null,
    offices: raw.offices ?? [],
    fax: raw.offices?.[0]?.fax ?? undefined,
    parliamentId: raw.district_id ? String(raw.district_id) : undefined,
    boundaryUrl: boundaryUrl ?? raw.related?.boundary_url ?? undefined,
    boundaryData: null,
    createdAt: undefined,
  } as unknown as Representative;

  __debugCheckRepId(rep.id as string);
  return rep;
}

export async function fetchRepsByPostal(postal: string, useCache: boolean = true): Promise<Representative[]> {
  const clean = postal.replace(/\s+/g, "").toUpperCase();

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(clean);
    if (cached) {
      console.log(`[fetchRepsByPostal] Returning ${cached.length} cached representatives for ${clean}`);
      return cached;
    }
  }

  // Fetch from API
  try {
    const res = await fetch(`https://represent.opennorth.ca/postcodes/${clean}/`);
    if (!res.ok) {
      throw new Error(`Represent API error ${res.status}`);
    }
    const data = await res.json();

    // Get boundary URLs from the boundaries_centroid array
    const boundaries: OpenNorthBoundary[] = data.boundaries_centroid || data.boundaries_concordance || [];

    // Create a mapping of district names to boundary URLs
    const boundaryMap = new Map<string, string>();
    boundaries.forEach((boundary: OpenNorthBoundary) => {
      boundaryMap.set(boundary.name.toLowerCase(), boundary.url);
    });

    // Include all levels of government: Federal (MP), Provincial (MPP/MLA/MNA), and Municipal
    const reps: OpenNorthRepresentative[] = (data.representatives_centroid || data.representatives_concordance || []);

    const representatives = await Promise.all(reps.map((rep) => {
      // Try to find matching boundary URL for this representative's district
      const boundaryUrl = boundaryMap.get(rep.district_name.toLowerCase());
      return toRepresentative(rep, boundaryUrl);
    }));

    // Cache the results
    if (useCache && representatives.length > 0) {
      await searchCacheRepository.cacheSearch(clean, representatives);
      console.log(`[fetchRepsByPostal] Cached ${representatives.length} representatives for ${clean}`);
    }

    return representatives;
  } catch (error) {
    // If API fails, try to return cached data as fallback
    console.error('[fetchRepsByPostal] API error:', error);
    const cached = await searchCacheRepository.getCachedSearch(clean);
    if (cached) {
      console.log(`[fetchRepsByPostal] API failed, returning ${cached.length} cached representatives for ${clean}`);
      return cached;
    }
    // No cache available, re-throw the error
    throw error;
  }
}

export { searchByName as fetchRepsByName }; 