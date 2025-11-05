/**
 * OpenStreetMap Nominatim geocoding utilities for Canadian postal codes
 * Provides accurate coordinate lookup for use with Represent API
 */

// User-Agent header as required by Nominatim usage policy
const USER_AGENT = "RepFinder/2.1.0 (contact@example.com)";

export interface NominatimCoordinates {
  lat: number;
  lon: number;
  source: "osm_nominatim";
}

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    country: string;
    country_code: string;
    postcode?: string;
    [key: string]: any;
  };
  boundingbox: [string, string, string, string];
  importance?: number;
  icon?: string;
}

/**
 * Normalize Canadian postal code to uppercase format without spaces
 * Example: "m1c 5e9" -> "M1C5E9"
 */
export function normalizePostalCode(postal: string): string {
  return postal.toUpperCase().replace(/\s+/g, "");
}

/**
 * Generic fetch function with proper headers for Nominatim
 */
async function fetchNominatim(url: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim API error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout after 10 seconds');
    }
    throw error;
  }
}

/**
 * Geocode Canadian postal code using OpenStreetMap Nominatim
 * Uses multiple strategies for best results with Canadian postal codes
 */
export async function geocodePostalCodeOSM(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } }> {
  const cleanPostal = normalizePostalCode(postal);

  // Strategy 1: Structured query with explicit country and postal code
  const structuredUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&country=Canada&postalcode=${encodeURIComponent(cleanPostal)}&limit=1&addressdetails=1`;

  try {
    console.log(`[geocodePostalCodeOSM] Attempting structured query for ${cleanPostal}`);
    const data = await fetchNominatim(structuredUrl);

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0] as NominatimResult;
      const coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        source: "osm_nominatim" as const,
        urls: { nominatim: structuredUrl }
      };

      console.log(`[geocodePostalCodeOSM] Found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    console.log(`[geocodePostalCodeOSM] Structured query returned no results, trying alternative strategies`);

  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Structured query failed, trying alternatives:`, error);
  }

  // Strategy 2: Try with space in postal code format (FSA + space + LDU)
  const spacedPostal = cleanPostal.slice(0, 3) + " " + cleanPostal.slice(3);
  const spacedUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&country=Canada&postalcode=${encodeURIComponent(spacedPostal)}&limit=1&addressdetails=1`;

  try {
    console.log(`[geocodePostalCodeOSM] Trying spaced format: ${spacedPostal}`);
    const spacedData = await fetchNominatim(spacedUrl);

    if (Array.isArray(spacedData) && spacedData.length > 0) {
      const result = spacedData[0] as NominatimResult;
      const coordinates = {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        source: "osm_nominatim" as const,
        urls: { nominatim: spacedUrl }
      };

      console.log(`[geocodePostalCodeOSM] Spaced format found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Spaced format failed:`, error);
  }

  // Strategy 3: Try free-form query with more explicit Canadian context
  const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(spacedPostal + ", Canada")}&limit=1&addressdetails=1&countrycodes=ca`;

  try {
    console.log(`[geocodePostalCodeOSM] Trying free-form query with country restriction`);
    const fallbackData = await fetchNominatim(fallbackUrl);

    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
      const result = fallbackData[0] as NominatimResult;

      // Verify the result is actually in Canada
      if (result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')) {
        const coordinates = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          source: "osm_nominatim" as const,
          urls: { nominatim: fallbackUrl }
        };

        console.log(`[geocodePostalCodeOSM] Free-form query found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
        return coordinates;
      } else {
        console.log(`[geocodePostalCodeOSM] Free-form query returned non-Canadian result: ${result.display_name}`);
      }
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Free-form query failed:`, error);
  }

  // Strategy 4: Try Forward Sortation Area (FSA) only
  const fsa = cleanPostal.slice(0, 3);
  const fsaUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(fsa + ", Canada")}&limit=3&addressdetails=1&countrycodes=ca`;

  try {
    console.log(`[geocodePostalCodeOSM] Trying FSA-only lookup: ${fsa}`);
    const fsaData = await fetchNominatim(fsaUrl);

    if (Array.isArray(fsaData) && fsaData.length > 0) {
      // Find the first result that's actually in Canada and matches our FSA
      const canadianResult = fsaData.find(result =>
        result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')
      );

      if (canadianResult) {
        const coordinates = {
          lat: parseFloat(canadianResult.lat),
          lon: parseFloat(canadianResult.lon),
          source: "osm_nominatim" as const,
          urls: { nominatim: fsaUrl }
        };

        console.log(`[geocodePostalCodeOSM] FSA lookup found coordinates for ${cleanPostal}: [${coordinates.lat}, ${coordinates.lon}]`);
        return coordinates;
      }
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] FSA lookup failed:`, error);
  }

  throw new Error(`Postal code "${cleanPostal}" not found via any OpenStreetMap Nominatim strategy`);
}

/**
 * Simple retry wrapper for transient errors - Nominatim ONLY
 */
export async function geocodeWithRetry(
  postal: string,
  maxRetries: number = 2
): Promise<NominatimCoordinates & { urls: { nominatim: string } }> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await geocodePostalCodeOSM(postal);
    } catch (error) {
      lastError = error as Error;
      console.log(`[geocodeWithRetry] Nominatim attempt ${attempt} failed for ${postal}:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff: 1 second, then 2 seconds
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[geocodeWithRetry] Retrying Nominatim in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const cleanPostal = normalizePostalCode(postal);
  throw new Error(`Unable to geocode postal code ${cleanPostal} via OpenStreetMap Nominatim after ${maxRetries} attempts. Please check the postal code format or try location-based search.`);
}