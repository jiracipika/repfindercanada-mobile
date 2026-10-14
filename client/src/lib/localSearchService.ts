/**
 * Local Search Service - Complete Offline Canadian Representative Finder
 * Uses local postal code database + Represent API for offline-first functionality
 */

import type { ApiRepresentative } from "@shared/schema";
import {
  fetchRepsByPostalCodeDirect,
  fetchRepsByNameDirect,
  fetchRepsByRidingDirect
} from "./representApiService";
import {
  getCoordinatesFromPostalCodeLocal,
  LocalPostalLookup
} from "./localPostalLookup";

/**
 * Search representatives by postal code using local database + Represent API
 * This is completely offline-first except for the Represent API call
 */
export async function fetchRepsByPostalLocal(postalCode: string): Promise<ApiRepresentative[]> {
  try {

    // Validate postal code format
    if (!LocalPostalLookup.isValidCanadianPostalCode(postalCode)) {
      throw new Error('Invalid Canadian postal code format');
    }

    // Normalize postal code
    const normalizedCode = LocalPostalLookup.normalizePostalCode(postalCode);

    // Get coordinates and representatives using local data + Represent API
    const result = await fetchRepsByPostalCodeDirect(normalizedCode);
    return result.representatives;

  } catch (error) {
    console.error(`[LocalSearch] Error searching postal code ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Search representatives by name using Represent API directly
 */
export async function fetchRepsByNameLocal(name: string): Promise<ApiRepresentative[]> {
  try {

    if (!name.trim()) {
      throw new Error('Please enter a name to search');
    }

    const representatives = await fetchRepsByNameDirect(name.trim());
    return representatives;

  } catch (error) {
    console.error(`[LocalSearch] Error searching name ${name}:`, error);
    throw error;
  }
}

/**
 * Search representatives by riding/constituency name using Represent API directly
 */
export async function fetchRepsByRidingLocal(ridingName: string): Promise<ApiRepresentative[]> {
  try {

    if (!ridingName.trim()) {
      throw new Error('Please enter a riding name to search');
    }

    const representatives = await fetchRepsByRidingDirect(ridingName.trim());
    return representatives;

  } catch (error) {
    console.error(`[LocalSearch] Error searching riding ${ridingName}:`, error);
    throw error;
  }
}

/**
 * Get geocoding information for a postal code (local lookup only)
 */
export async function getPostalCodeGeocodingLocal(postalCode: string): Promise<{
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  confidence?: number;
  source: string;
}> {
  try {

    // Validate postal code format
    if (!LocalPostalLookup.isValidCanadianPostalCode(postalCode)) {
      throw new Error('Invalid Canadian postal code format');
    }

    // Normalize postal code
    const normalizedCode = LocalPostalLookup.normalizePostalCode(postalCode);

    // Get coordinates from local database
    const coordinates = await getCoordinatesFromPostalCodeLocal(normalizedCode);
    if (!coordinates) {
      throw new Error(`Postal code not found in database: ${normalizedCode}`);
    }

    return {
      postalCode: normalizedCode,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: coordinates.matchedOn === 'prefix'
        ? `local-database-prefix:${coordinates.matchedPrefix}`
        : 'local-database',
      confidence: coordinates.matchedOn === 'exact' ? 1.0 : 0.9 // prefix = same block/FSA, not the exact code
    };

  } catch (error) {
    console.error(`[LocalSearch] Error geocoding postal code ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Enhanced postal code search that includes geocoding information
 * Returns both representatives and geocoding details using local data
 */
export async function getLocationDataWithLocalGeocoding(postalCode: string): Promise<{
  representatives: ApiRepresentative[];
  geocoding: {
    postalCode: string;
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    confidence?: number;
    source: string;
  };
}> {
  try {

    // Validate postal code format
    if (!LocalPostalLookup.isValidCanadianPostalCode(postalCode)) {
      throw new Error('Invalid Canadian postal code format');
    }

    // Normalize postal code
    const normalizedCode = LocalPostalLookup.normalizePostalCode(postalCode);

    // Get coordinates from local database
    const coordinates = await getCoordinatesFromPostalCodeLocal(normalizedCode);
    if (!coordinates) {
      throw new Error(`Postal code not found in database: ${normalizedCode}`);
    }

    // Search representatives using coordinates
    const searchResult = await fetchRepsByPostalCodeDirect(normalizedCode);
    const representatives = searchResult.representatives;

    return {
      representatives,
      geocoding: {
        postalCode: normalizedCode,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        source: coordinates.matchedOn === 'prefix'
          ? `local-database-prefix:${coordinates.matchedPrefix}`
          : 'local-database',
        confidence: coordinates.matchedOn === 'exact' ? 1.0 : 0.9
      }
    };
  } catch (error) {
    console.error(`[LocalSearch] Enhanced search failed for ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Search representatives by coordinates using local postal lookup + Represent API
 */
export async function fetchRepsByCoordinatesLocal(
  latitude: number,
  longitude: number
): Promise<ApiRepresentative[]> {
  try {

    const { fetchRepsByCoordinatesDirect } = await import("./representApiService");
    const representatives = await fetchRepsByCoordinatesDirect(latitude, longitude);

    return representatives;
  } catch (error) {
    console.error(`[LocalSearch] Error searching coordinates [${latitude}, ${longitude}]:`, error);
    throw error;
  }
}

/**
 * Get status of local postal data
 */
export function getLocalDataStatus(): {
  isLoaded: boolean;
  stats: { totalPostalCodes: number; dataSize: number };
  isDataAvailable: boolean;
} {
  const { isLocalDataLoaded, getLocalDataStats } = require('./localPostalLookup');

  return {
    isLoaded: isLocalDataLoaded(),
    stats: getLocalDataStats(),
    isDataAvailable: isLocalDataLoaded() && getLocalDataStats().totalPostalCodes > 0
  };
}

/**
 * Wait for local data to be loaded
 */
export async function waitForLocalData(): Promise<void> {
  const { getCoordinatesFromPostalCodeLocal } = await import('./localPostalLookup');
  // This will wait for data to load automatically
}

/**
 * Normalize Canadian postal code format (export from LocalPostalLookup)
 */
export function normalizePostalCode(postalCode: string): string {
  return LocalPostalLookup.normalizePostalCode(postalCode);
}

/**
 * Validate Canadian postal code format (export from LocalPostalLookup)
 */
export function isValidCanadianPostalCode(postalCode: string): boolean {
  return LocalPostalLookup.isValidCanadianPostalCode(postalCode);
}