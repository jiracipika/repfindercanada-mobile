import type { Representative } from "@shared/schema";
import { searchByName } from "./api/represent";
import { makeRepresentativeId, __debugCheckRepId } from "./repId";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { normalizePostalCode } from "./nominatim";

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

// Interface for coordinate data from postal code lookup
interface CoordinatesData {
  latitude: number;
  longitude: number;
  postalCode: string;
}

// Interface for boundary data
interface BoundaryData {
  url: string;
  name: string;
  boundary_set_name: string;
  external_id?: string;
  metadata?: {
    shape_area?: number;
    shape_length?: number;
    [key: string]: any;
  };
}

/**
 * Prioritize boundary sets to ensure we get the most current electoral boundaries
 * Federal: 2023 > 2013 > 2003 representation orders
 * Provincial: 2015 > 2005 representation acts
 * Municipal: Current city wards > older divisions
 */
function prioritizeBoundarySet(boundarySetName: string): number {
  const lowerName = boundarySetName.toLowerCase();

  // Federal boundaries - prioritize newest representation order
  if (lowerName.includes('federal electoral district')) {
    if (lowerName.includes('2023')) return 1;
    if (lowerName.includes('2013')) return 2;
    if (lowerName.includes('2003')) return 3;
    return 4;
  }

  // Provincial boundaries - prioritize newest representation act
  if (lowerName.includes('ontario electoral district')) {
    if (lowerName.includes('2015')) return 5;
    if (lowerName.includes('2005')) return 6;
    return 7;
  }

  // Municipal boundaries
  if (lowerName.includes('toronto wards') || lowerName.includes('mississauga wards') ||
      lowerName.includes('peel wards')) {
    return 8;
  }

  // Census subdivisions (current)
  if (lowerName.includes('census subdivision')) {
    return 9;
  }

  // Census divisions (regional)
  if (lowerName.includes('census division')) {
    return 10;
  }

  // School boards (lower priority)
  if (lowerName.includes('school board')) {
    return 11;
  }

  return 12; // Other
}

/**
 * Get the most current boundary for a given district name from multiple boundary options
 */
function getBestBoundaryForDistrict(districtName: string, boundaries: OpenNorthBoundary[]): OpenNorthBoundary | undefined {
  const matchingBoundaries = boundaries.filter(boundary =>
    boundary.name.toLowerCase() === districtName.toLowerCase()
  );

  if (matchingBoundaries.length === 0) return undefined;
  if (matchingBoundaries.length === 1) return matchingBoundaries[0];

  // Sort by priority and return the best one
  matchingBoundaries.sort((a, b) => {
    const priorityA = prioritizeBoundarySet(a.boundary_set_name);
    const priorityB = prioritizeBoundarySet(b.boundary_set_name);
    return priorityA - priorityB;
  });

  return matchingBoundaries[0];
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

    // Sort boundaries by priority to get the most current ones
    boundaries.sort((a, b) => {
      const priorityA = prioritizeBoundarySet(a.boundary_set_name);
      const priorityB = prioritizeBoundarySet(b.boundary_set_name);
      return priorityA - priorityB;
    });

    console.log(`[fetchRepsByPostal] Found ${boundaries.length} boundaries for ${clean}, prioritizing current ones`);

    // Include all levels of government: Federal (MP), Provincial (MPP/MLA/MNA), and Municipal
    const reps: OpenNorthRepresentative[] = (data.representatives_centroid || data.representatives_concordance || []);

    const representatives = await Promise.all(reps.map((rep) => {
      // Use the best boundary for this representative's district
      const bestBoundary = getBestBoundaryForDistrict(rep.district_name, boundaries);
      return toRepresentative(rep, bestBoundary?.url);
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

/**
 * Convert postal code to coordinates using OpenNorth postcode centroid
 * Returns coordinates with latitude and longitude
 * Uses the same approach as getRepsPrecise - no Nominatim dependency
 */
export async function postalCodeToCoordinates(postal: string): Promise<CoordinatesData> {
  const clean = normalizePostalCode(postal);

  try {
    // Use OpenNorth postcode centroid (same as getRepsPrecise fallback)
    const url = `https://represent.opennorth.ca/postcodes/${encodeURIComponent(clean)}/`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RepFinder coordinates",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenNorth API error ${response.status}`);
    }

    const data = await response.json();

    if (!data?.centroid?.coordinates || data.centroid.coordinates.length < 2) {
      throw new Error(`Could not get coordinates for postal code ${clean}`);
    }

    // GeoJSON order is [lon, lat]
    const [lon, lat] = data.centroid.coordinates.map(Number);

    console.log(`[postalCodeToCoordinates] Converted ${clean} to coordinates [${lat}, ${lon}] via OpenNorth`);

    return {
      latitude: lat,
      longitude: lon,
      postalCode: clean
    };
  } catch (error) {
    console.error('[postalCodeToCoordinates] Error:', error);
    throw error;
  }
}

/**
 * Search representatives by coordinates using Represent API
 * This provides 100% accuracy compared to postal code lookup
 * Uses both coordinate orders like getRepsPrecise for maximum reliability
 */
export async function fetchRepsByCoordinates(latitude: number, longitude: number): Promise<Representative[]> {
  try {
    // Try both coordinate orders like getRepsPrecise
    const urls = [
      `https://represent.opennorth.ca/representatives/?point=${latitude.toFixed(7)},${longitude.toFixed(7)}`,
      `https://represent.opennorth.ca/representatives/?point=${longitude.toFixed(7)},${latitude.toFixed(7)}`
    ];

    let representatives: Representative[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const data = await res.json();

        // The API returns an 'objects' array with representatives
        if (data && Array.isArray(data.objects) && data.objects.length > 0) {
          const reps = await Promise.all(
            data.objects.map((rep: OpenNorthRepresentative) => toRepresentative(rep))
          );

          if (reps.length > 0) {
            representatives = reps;
            console.log(`[fetchRepsByCoordinates] Found ${reps.length} representatives for coordinates [${latitude}, ${longitude}] using order ${url.includes(latitude.toFixed(7) + ',' + longitude.toFixed(7)) ? 'lat,lon' : 'lon,lat'}`);
            break;
          }
        }
      } catch {
        // Try the next coordinate order
        continue;
      }
    }

    if (representatives.length === 0) {
      throw new Error(`OpenNorth did not return representatives for coordinates [${latitude}, ${longitude}]`);
    }

    return representatives;
  } catch (error) {
    console.error('[fetchRepsByCoordinates] Error:', error);
    throw error;
  }
}

/**
 * Get boundaries that contain the given coordinates
 * This helps understand the electoral districts and jurisdictions
 */
export async function getBoundariesByCoordinates(latitude: number, longitude: number): Promise<BoundaryData[]> {
  try {
    // Use the boundaries endpoint with contains parameter
    const res = await fetch(`https://represent.opennorth.ca/boundaries/?contains=${latitude},${longitude}`);
    if (!res.ok) {
      throw new Error(`Represent API error ${res.status} for boundaries at coordinates [${latitude}, ${longitude}]`);
    }

    const data = await res.json();

    // The API returns an 'objects' array with boundaries
    if (data && Array.isArray(data.objects)) {
      console.log(`[getBoundariesByCoordinates] Found ${data.objects.length} boundaries for coordinates [${latitude}, ${longitude}]`);
      return data.objects as BoundaryData[];
    }

    return [];
  } catch (error) {
    console.error('[getBoundariesByCoordinates] Error:', error);
    throw error;
  }
}

/**
 * Get comprehensive location data including representatives and boundaries
 * This provides complete information about a location
 */
export async function getLocationDataByCoordinates(latitude: number, longitude: number): Promise<{
  representatives: Representative[];
  boundaries: BoundaryData[];
}> {
  try {
    // Fetch both representatives and boundaries in parallel
    const [representatives, boundaries] = await Promise.all([
      fetchRepsByCoordinates(latitude, longitude),
      getBoundariesByCoordinates(latitude, longitude)
    ]);

    return {
      representatives,
      boundaries
    };
  } catch (error) {
    console.error('[getLocationDataByCoordinates] Error:', error);
    throw error;
  }
}

/**
 * Enhanced version of fetchRepsByPostal that uses OpenNorth coordinates + precise search for better accuracy
 * First converts postal code to coordinates via OpenNorth postcode centroid, then searches by coordinates
 */
export async function fetchRepsByPostalEnhanced(postal: string, useCache: boolean = true): Promise<Representative[]> {
  const clean = normalizePostalCode(postal);

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(clean);
    if (cached) {
      console.log(`[fetchRepsByPostalEnhanced] Returning ${cached.length} cached representatives for ${clean}`);
      return cached;
    }
  }

  try {
    // Step 1: Convert postal code to coordinates using OpenNorth postcode centroid
    const coordinates = await postalCodeToCoordinates(clean);
    console.log(`[fetchRepsByPostalEnhanced] Converted ${clean} to coordinates [${coordinates.latitude}, ${coordinates.longitude}] via OpenNorth`);

    // Step 2: Search representatives using coordinates for maximum accuracy (both coordinate orders)
    const representatives = await fetchRepsByCoordinates(coordinates.latitude, coordinates.longitude);

    // Step 3: Also try federal-specific endpoint to ensure we get the MP
    let federalReps: Representative[] = [];
    try {
      const federalRes = await fetch(`https://represent.opennorth.ca/representatives/house-of-commons/?point=${coordinates.latitude},${coordinates.longitude}&pretty=1`);
      if (federalRes.ok) {
        const federalData = await federalRes.json();
        if (federalData.objects && Array.isArray(federalData.objects)) {
          federalReps = await Promise.all(
            federalData.objects.map((rep: OpenNorthRepresentative) => toRepresentative(rep))
          );
          console.log(`[fetchRepsByPostalEnhanced] Found ${federalReps.length} federal representatives for ${clean}`);
        }
      }
    } catch (federalError) {
      console.log('[fetchRepsByPostalEnhanced] Federal-specific query failed, using general results');
    }

    // Combine results, prioritizing federal reps and removing duplicates
    const allReps = [...federalReps, ...representatives];
    const uniqueReps = allReps.filter((rep, index, self) =>
      index === self.findIndex((r) => r.name === rep.name && r.constituency === rep.constituency)
    );

    // Cache the results
    if (useCache && uniqueReps.length > 0) {
      await searchCacheRepository.cacheSearch(clean, uniqueReps);
      console.log(`[fetchRepsByPostalEnhanced] Cached ${uniqueReps.length} representatives for ${clean}`);
    }

    return uniqueReps;
  } catch (error) {
    console.error('[fetchRepsByPostalEnhanced] Error with coordinate approach:', error);

    // Fallback to original postal code method if coordinate-based search fails
    console.log('[fetchRepsByPostalEnhanced] Falling back to original Represent postal code method');
    try {
      return await fetchRepsByPostal(postal, useCache);
    } catch (fallbackError) {
      console.error('[fetchRepsByPostalEnhanced] All methods failed for postal code:', clean);
      throw new Error(`Unable to find representatives for postal code ${clean}. Please try again or use location-based search.`);
    }
  }
}

export { searchByName as fetchRepsByName };