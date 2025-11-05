/**
 * R-based search service - replaces existing representApi functionality
 * Uses the converted R logic for better Canadian postal code support
 */

import type { Representative } from "@shared/schema";
import { getRepsFromAddress, convertToExistingFormat, Representative as RRepresentative } from "./rGeocodeSearch";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { normalizePostalCode } from "./nominatim";

/**
 * Enhanced postal code search using R-based approach
 * This replaces fetchRepsByPostalEnhanced with the more reliable R logic
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

  try {
    console.log(`[fetchRepsByPostalR] Using R-based search for ${clean}`);

    // Use the R-based geocoding and representative search
    const rResults = await getRepsFromAddress(clean);
    console.log(`[fetchRepsByPostalR] R search found ${rResults.length} representatives`);

    // Convert R results to existing format for UI compatibility
    const representatives = convertToExistingFormat(rResults);

    // Cache the results
    if (useCache && representatives.length > 0) {
      await searchCacheRepository.cacheSearch(clean, representatives);
      console.log(`[fetchRepsByPostalR] Cached ${representatives.length} representatives for ${clean}`);
    }

    return representatives;
  } catch (error) {
    console.error(`[fetchRepsByPostalR] Error with R-based search:`, error);

    // Fallback to original method if R search fails
    console.log(`[fetchRepsByPostalR] Falling back to original representApi method`);
    try {
      // Import here to avoid circular dependency
      const { fetchRepsByPostalEnhanced } = await import("./representApi");
      return await fetchRepsByPostalEnhanced(postal, useCache);
    } catch (fallbackError) {
      console.error(`[fetchRepsByPostalR] All search methods failed for postal code:`, clean);
      throw new Error(`Unable to find representatives for postal code ${clean}. Please try again or use location-based search.`);
    }
  }
}

/**
 * Enhanced location-based search using R-based approach
 * This replaces fetchRepsByCoordinates with the R logic
 */
export async function fetchRepsByCoordinatesR(
  latitude: number,
  longitude: number
): Promise<Representative[]> {
  try {
    console.log(`[fetchRepsByCoordinatesR] Using R-based search for coordinates [${latitude}, ${longitude}]`);

    // Convert coordinates to a search query for R function
    const query = `${latitude},${longitude}`;
    const rResults = await getRepsFromAddress(query);
    console.log(`[fetchRepsByCoordinatesR] R search found ${rResults.length} representatives`);

    // Convert R results to existing format for UI compatibility
    const representatives = convertToExistingFormat(rResults);

    return representatives;
  } catch (error) {
    console.error(`[fetchRepsByCoordinatesR] Error with R-based coordinate search:`, error);

    // Fallback to original method if R search fails
    console.log(`[fetchRepsByCoordinatesR] Falling back to original representApi method`);
    try {
      // Import here to avoid circular dependency
      const { fetchRepsByCoordinates } = await import("./representApi");
      return await fetchRepsByCoordinates(latitude, longitude);
    } catch (fallbackError) {
      console.error(`[fetchRepsByCoordinatesR] All coordinate search methods failed`);
      throw fallbackError;
    }
  }
}

/**
 * Get comprehensive search results with R-based logic
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
    rResults: RRepresentative[];
    coordinates?: { lat: number; lon: number; source: string };
  };
}> {
  const cleanQuery = normalizePostalCode(query);

  try {
    console.log(`[getLocationDataR] Starting R-based search: ${cleanQuery} (${searchType})`);

    // Use the R-based search
    const rResults = await getRepsFromAddress(cleanQuery);
    console.log(`[getLocationDataR] R search completed with ${rResults.length} results`);

    // Convert to existing format
    const representatives = convertToExistingFormat(rResults);

    // Extract coordinate info if available
    const coordinates = rResults.length > 0 ? {
      lat: rResults[0].latitude,
      lon: rResults[0].longitude,
      source: rResults[0].coord_source
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
        rResults,
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
 * Combines R logic with improved name matching and fallback strategies
 */
export async function fetchRepsByNameR(name: string): Promise<Representative[]> {
  if (!name.trim()) {
    return [];
  }

  console.log(`[fetchRepsByNameR] Using R-enhanced name search for "${name}"`);

  try {
    // Import the original method for fallback
    const { fetchRepsByName } = await import("./representApi");

    // Try the enhanced name search first
    const results = await fetchRepsByName(name);
    console.log(`[fetchRepsByNameR] Found ${results.length} representatives with enhanced search`);

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

  } catch (error) {
    console.error(`[fetchRepsByNameR] Error with R-enhanced name search:`, error);

    // Fallback to basic name search
    console.log(`[fetchRepsByNameR] Using basic name search as fallback`);
    const { fetchRepsByName } = await import("./representApi");
    return fetchRepsByName(name);
  }
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