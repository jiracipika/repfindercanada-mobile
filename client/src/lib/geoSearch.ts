import type { Representative } from "@shared/schema";
import { fetchRepsByCoordinates, getLocationDataByCoordinates, postalCodeToCoordinates } from "./representApi";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { logActivity } from "./storage/activityRepository";

/**
 * Search representatives by current device location
 */
export async function searchRepresentativesByLocation(
  latitude: number,
  longitude: number,
  useCache: boolean = true
): Promise<Representative[]> {
  const cacheKey = `geo_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(cacheKey);
    if (cached) {
      console.log(`[searchRepresentativesByLocation] Returning ${cached.length} cached representatives for coordinates [${latitude}, ${longitude}]`);
      return cached;
    }
  }

  try {
    const representatives = await fetchRepsByCoordinates(latitude, longitude);

    // Cache the results
    if (useCache && representatives.length > 0) {
      await searchCacheRepository.cacheSearch(cacheKey, representatives);
      console.log(`[searchRepresentativesByLocation] Cached ${representatives.length} representatives for coordinates [${latitude}, ${longitude}]`);
    }

    // Log the location-based search activity
    await logActivity({
      type: "search",
      query: `${latitude},${longitude}`,
      searchType: "location",
      ts: Date.now(),
      representatives: representatives,
    });

    return representatives;
  } catch (error) {
    console.error('[searchRepresentativesByLocation] Error:', error);
    throw error;
  }
}

/**
 * Get comprehensive location data including representatives and boundaries
 */
export async function getCompleteLocationData(
  latitude: number,
  longitude: number,
  useCache: boolean = true
) {
  const cacheKey = `complete_geo_${latitude.toFixed(4)}_${longitude.toFixed(4)}`;

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(cacheKey);
    if (cached) {
      console.log(`[getCompleteLocationData] Returning cached location data for coordinates [${latitude}, ${longitude}]`);
      // Return cached representatives with empty boundaries since we don't cache boundaries
      return {
        representatives: cached,
        boundaries: []
      };
    }
  }

  try {
    const locationData = await getLocationDataByCoordinates(latitude, longitude);

    // Cache the results (cache the representatives portion)
    if (useCache && locationData.representatives.length > 0) {
      await searchCacheRepository.cacheSearch(cacheKey, locationData.representatives);
      console.log(`[getCompleteLocationData] Cached location data for coordinates [${latitude}, ${longitude}]`);
    }

    // Log the location-based search activity
    await logActivity({
      type: "search",
      query: `${latitude},${longitude}`,
      searchType: "locationComplete",
      ts: Date.now(),
      representatives: locationData.representatives,
    });

    return locationData;
  } catch (error) {
    console.error('[getCompleteLocationData] Error:', error);
    throw error;
  }
}

/**
 * Convert postal code to coordinates and then search by location
 * This combines postal code input with coordinate-based accuracy
 */
export async function searchByPostalCodeWithCoordinates(
  postalCode: string,
  useCache: boolean = true
): Promise<{
  representatives: Representative[];
  coordinates: { latitude: number; longitude: number };
  boundaries: any[];
}> {
  const clean = postalCode.replace(/\s+/g, "").toUpperCase();

  try {
    // Step 1: Convert postal code to coordinates
    const coordinates = await postalCodeToCoordinates(clean);
    console.log(`[searchByPostalCodeWithCoordinates] Converted ${clean} to coordinates [${coordinates.latitude}, ${coordinates.longitude}]`);

    // Step 2: Get complete location data using coordinates
    const locationData = await getCompleteLocationData(
      coordinates.latitude,
      coordinates.longitude,
      useCache
    );

    return {
      representatives: locationData.representatives,
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude
      },
      boundaries: locationData.boundaries
    };
  } catch (error) {
    console.error('[searchByPostalCodeWithCoordinates] Error:', error);
    throw error;
  }
}

/**
 * Utility function to validate coordinates are within reasonable bounds for Canada
 */
export function validateCanadianCoordinates(latitude: number, longitude: number): boolean {
  // Canada roughly spans:
  // Latitude: 41.7°N to 83.1°N
  // Longitude: 141.0°W to 52.6°W

  const isValidLatitude = latitude >= 41.0 && latitude <= 84.0;
  const isValidLongitude = longitude >= -142.0 && longitude <= -52.0;

  return isValidLatitude && isValidLongitude;
}

/**
 * Get a human-readable description of the boundary types found
 */
export function describeBoundaries(boundaries: any[]): string {
  if (!boundaries || boundaries.length === 0) {
    return "No boundaries found";
  }

  const boundaryTypes = new Set<string>();
  boundaries.forEach(boundary => {
    if (boundary.boundary_set_name) {
      boundaryTypes.add(boundary.boundary_set_name);
    }
  });

  if (boundaryTypes.size === 0) {
    return `${boundaries.length} boundaries found`;
  }

  const typeList = Array.from(boundaryTypes).slice(0, 3).join(', ');
  const additional = boundaryTypes.size > 3 ? ` +${boundaryTypes.size - 3} more` : '';

  return `Found: ${typeList}${additional}`;
}