/**
 * R-based search service - replaces existing representApi functionality
 * Uses the converted R logic for better Canadian postal code support
 */

import type { Representative } from "@shared/schema";
import { getRepsFromAddress, convertToExistingFormat, Representative as RRepresentative } from "./rGeocodeSearch";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { normalizePostalCode } from "./nominatim";

/**
 * Enhanced postal code search using precise getRepsPrecise logic
 * Uses OpenNorth postcode centroid with no fallbacks for maximum reliability
 */
export async function fetchRepsByPostalR(
  postal: string,
  useCache: boolean = true
): Promise<Representative[]> {
  const clean = normalizePostalCode(postal);

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(clean);
    if (cached) {
      console.log(`[fetchRepsByPostalR] Returning ${cached.length} cached representatives for ${clean}`);
      return cached;
    }
  }

  console.log(`[fetchRepsByPostalR] Using precise search for ${clean}`);

  // Use the precise geocoding and representative search (getRepsPrecise logic)
  const preciseResults = await getRepsFromAddress(clean);
  console.log(`[fetchRepsByPostalR] Precise search found ${preciseResults.length} representatives`);

  // Convert precise results to existing format for UI compatibility
  const representatives = convertToExistingFormat(preciseResults);

  // Cache the results
  if (useCache && representatives.length > 0) {
    await searchCacheRepository.cacheSearch(clean, representatives);
    console.log(`[fetchRepsByPostalR] Cached ${representatives.length} representatives for ${clean}`);
  }

  return representatives;
}

/**
 * Enhanced location-based search using precise getRepsPrecise logic
 * Uses coordinate-based search with both lat,lon and lon,lat attempts
 */
export async function fetchRepsByCoordinatesR(
  latitude: number,
  longitude: number
): Promise<Representative[]> {
  console.log(`[fetchRepsByCoordinatesR] Using precise search for coordinates [${latitude}, ${longitude}]`);

  // Convert coordinates to a search query for precise function
  const query = `${latitude},${longitude}`;
  const preciseResults = await getRepsFromAddress(query);
  console.log(`[fetchRepsByCoordinatesR] Precise search found ${preciseResults.length} representatives`);

  // Convert precise results to existing format for UI compatibility
  const representatives = convertToExistingFormat(preciseResults);

  return representatives;
}

/**
 * Get comprehensive search results with precise getRepsPrecise logic
 * Returns structured data similar to the original app format
 */
export async function getLocationDataR(
  query: string,
  searchType: "postal" | "address" | "coordinates" = "postal",
  useCache: boolean = true
): Promise<{
  representatives: Representative[];
  debug: {
    query: string;
    searchType: string;
    preciseResults: RRepresentative[];
    coordinates?: { lat: number; lon: number; source: string };
  };
}> {
  const cleanQuery = normalizePostalCode(query);

  try {
    console.log(`[getLocationDataR] Starting precise search: ${cleanQuery} (${searchType})`);

    // Use the precise search
    const preciseResults = await getRepsFromAddress(cleanQuery);
    console.log(`[getLocationDataR] Precise search completed with ${preciseResults.length} results`);

    // Convert to existing format
    const representatives = convertToExistingFormat(preciseResults);

    // Extract coordinate info if available
    const coordinates = preciseResults.length > 0 ? {
      lat: preciseResults[0].latitude,
      lon: preciseResults[0].longitude,
      source: preciseResults[0].coord_source
    } : undefined;

    // Cache the results if this is a postal code search
    if (searchType === "postal" && useCache && representatives.length > 0) {
      await searchCacheRepository.cacheSearch(cleanQuery, representatives);
      console.log(`[getLocationDataR] Cached ${representatives.length} representatives for ${cleanQuery}`);
    }

    return {
      representatives,
      debug: {
        query: cleanQuery,
        searchType,
        preciseResults,
        coordinates
      }
    };
  } catch (error) {
    console.error(`[getLocationDataR] Error:`, error);
    throw error;
  }
}

/**
 * Enhanced search by name using R-based approach
 * No fallbacks - direct name search through existing API
 */
export async function fetchRepsByNameR(name: string): Promise<Representative[]> {
  if (!name.trim()) {
    return [];
  }

  console.log(`[fetchRepsByNameR] Using name search for "${name}"`);

  // Import the original method for name search
  const { fetchRepsByName } = await import("./representApi");
  const results = await fetchRepsByName(name);
  console.log(`[fetchRepsByNameR] Found ${results.length} representatives`);

  // Apply R-style filtering and processing to improve results
  const processedResults = results.map(rep => {
    // Ensure we have proper R-style data structure
    if (!rep.rep_set) {
      rep.rep_set = rep.electedOffice === 'MP' ? 'House of Commons' :
                   rep.electedOffice === 'MPP' || rep.electedOffice === 'MLA' ? 'Provincial Legislature' :
                   'Municipal Government';
    }

    return rep;
  });

  // Sort using the same R-based logic as postal code searches
  const sortedResults = processedResults.sort((a, b) => {
    // R-style priority: Federal -> Provincial -> Municipal
    const getRLevel = (office: string | null | undefined): number => {
      if (!office) return 999;
      const o = office.toLowerCase();
      if (o === 'mp') return 1;
      if (o === 'mpp' || o === 'mla' || o === 'mna') return 2;
      if (o === 'mayor' || o === 'councillor' || o === 'councilor') return 3;
      return 999;
    };

    return getRLevel(a.electedOffice) - getRLevel(b.electedOffice);
  });

  console.log(`[fetchRepsByNameR] R-enhanced search returning ${sortedResults.length} processed representatives`);
  return sortedResults;
}

/**
 * Get federal representatives only (filtered from R results)
 */
export async function fetchFederalRepsR(
  query: string,
  useCache: boolean = true
): Promise<Representative[]> {
  const results = await fetchRepsByPostalR(query, useCache);
  return results.filter(rep => {
    // Check multiple ways to identify federal reps
    return (
      rep.electedOffice === "MP" ||
      rep.level === "Federal" ||
      rep.rep_set?.toLowerCase().includes("house of commons") ||
      rep.rep_set?.toLowerCase().includes("parliament")
    );
  });
}