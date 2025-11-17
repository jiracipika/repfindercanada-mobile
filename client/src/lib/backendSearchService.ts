/**
 * Backend Search Service - Radar-powered Canadian Representative Finder
 * Uses server-side Radar geocoding + Represent API for reliable postal code searches
 */

import type { Representative } from "@shared/schema";

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Search representatives by postal code using Radar geocoding + Represent API
 * This is the main postal code search function that calls our backend
 */
export async function fetchRepsByPostalBackend(postalCode: string): Promise<Representative[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/representatives/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: postalCode,
        type: 'postal_code'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.representatives || [];
  } catch (error) {
    console.error(`[BackendSearch] Error searching postal code ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Search representatives by name using backend API
 */
export async function fetchRepsByNameBackend(name: string): Promise<Representative[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/representatives/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: name,
        type: 'name'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.representatives || [];
  } catch (error) {
    console.error(`[BackendSearch] Error searching name ${name}:`, error);
    throw error;
  }
}

/**
 * Search representatives by riding/constituency name using backend API
 */
export async function fetchRepsByRidingBackend(ridingName: string): Promise<Representative[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/representatives/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ridingName,
        type: 'riding'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.representatives || [];
  } catch (error) {
    console.error(`[BackendSearch] Error searching riding ${ridingName}:`, error);
    throw error;
  }
}

/**
 * Get geocoding information for a postal code (coordinates, address, etc.)
 * Uses Radar geocoding API via our backend
 */
export async function getPostalCodeGeocoding(postalCode: string): Promise<{
  postalCode: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  confidence?: number;
  source: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postalCode
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Geocoding error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[BackendSearch] Error geocoding postal code ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Enhanced postal code search that includes geocoding information
 * Returns both representatives and geocoding details
 */
export async function getLocationDataWithGeocoding(postalCode: string): Promise<{
  representatives: Representative[];
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
    console.log(`[BackendSearch] Starting enhanced search for postal code: ${postalCode}`);

    // Get representatives using Radar + Represent API
    const representatives = await fetchRepsByPostalBackend(postalCode);
    console.log(`[BackendSearch] Found ${representatives.length} representatives`);

    // Get geocoding details
    const geocoding = await getPostalCodeGeocoding(postalCode);
    console.log(`[BackendSearch] Geocoded to: ${geocoding.latitude}, ${geocoding.longitude} via ${geocoding.source}`);

    return {
      representatives,
      geocoding
    };
  } catch (error) {
    console.error(`[BackendSearch] Enhanced search failed for ${postalCode}:`, error);
    throw error;
  }
}

/**
 * Search representatives by coordinates using backend
 * Note: This implementation still uses Represent API directly but can be enhanced
 */
export async function fetchRepsByCoordinatesBackend(
  latitude: number,
  longitude: number
): Promise<Representative[]> {
  try {
    // For coordinate searches, we can use the Represent API boundary endpoint directly
    // or enhance the backend to support coordinate searches in the future
    const response = await fetch(`${API_BASE_URL}/api/boundaries/?contains=${latitude},${longitude}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Boundary search error: ${response.status}`);
    }

    const boundaryData = await response.json();

    if (!boundaryData.objects || boundaryData.objects.length === 0) {
      return [];
    }

    // This is a simplified implementation - the full coordinate search
    // would need to query representatives for each boundary
    console.log(`[BackendSearch] Found ${boundaryData.objects.length} boundaries for coordinates`);

    // For now, return an empty array - this would need more implementation
    // to query representatives for each boundary found
    return [];
  } catch (error) {
    console.error(`[BackendSearch] Error searching coordinates [${latitude}, ${longitude}]:`, error);
    throw error;
  }
}

/**
 * Normalize Canadian postal code format
 */
export function normalizePostalCode(postalCode: string): string {
  const clean = postalCode.toUpperCase().replace(/\s+/g, '');
  return clean.length === 6 ? clean.slice(0, 3) + ' ' + clean.slice(3) : clean;
}

/**
 * Validate Canadian postal code format
 */
export function isValidCanadianPostalCode(postalCode: string): boolean {
  const clean = postalCode.toUpperCase().replace(/\s+/g, '');
  const pattern = /^[A-Z]\d[A-Z]\d[A-Z]\d$/;
  return pattern.test(clean);
}