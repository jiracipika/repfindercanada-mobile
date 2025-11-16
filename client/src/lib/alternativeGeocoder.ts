/**
 * Hybrid geocoding services for Canadian postal codes
 * Uses geocoder.ca outside Ontario, alternative geocoding for Ontario
 */

export interface GeocodeResult {
  lat: number;
  lon: number;
  source: string;
}

/**
 * Check if a postal code is from Ontario
 * Ontario postal codes start with: K, L, M, N, P
 */
function isOntarioPostalCode(postalCode: string): boolean {
  const clean = postalCode.toUpperCase().replace(/\s+/g, "");
  const firstLetter = clean.charAt(0);
  return ['K', 'L', 'M', 'N', 'P'].includes(firstLetter);
}

/**
 * Geocode using geocoder.ca API
 * Used for postal codes outside Ontario
 */
async function geocodeWithGeocoderCa(query: string): Promise<GeocodeResult | null> {
  try {
    const cleanPostal = query.toUpperCase().replace(/\s+/g, "");
    const spacedPostal = cleanPostal.slice(0, 3) + " " + cleanPostal.slice(3);

    const url = new URL("https://geocoder.ca/");
    url.searchParams.append("locate", spacedPostal);
    url.searchParams.append("json", "1");
    url.searchParams.append("_", Date.now().toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "CanadianRepFinder/3.0.0",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoder.ca: HTTP ${response.status}`);
    }

    const data = await response.json();
    const lat = data.latt || data.lat;
    const lon = data.longt || data.long || data.lon;

    if (!lat || !lon) {
      throw new Error("Geocoder.ca: no result");
    }

    return {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      source: "geocoder.ca"
    };
  } catch (error) {
    console.warn(`Geocoder.ca geocoding failed for ${query}:`, error);
    return null;
  }
}

/**
 * Geocode using OpenStreetMap Nominatim API
 * Used for Ontario postal codes
 */
async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", "1");
    url.searchParams.append("countrycodes", "ca");
    url.searchParams.append("q", query);
    url.searchParams.append("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "CanadianRepFinder/1.0 (geocoding request)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];
    if (!result.lat || !result.lon) {
      return null;
    }

    return {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      source: "nominatim"
    };
  } catch (error) {
    console.warn(`Nominatim geocoding failed:`, error);
    return null;
  }
}

/**
 * Geocode using Canada Post API (if available) or alternative Canadian service
 * Note: This would require API key for official Canada Post
 */
async function geocodeWithCanadaPost(query: string): Promise<GeocodeResult | null> {
  // For now, return null as Canada Post API requires authentication
  // This could be implemented if you have Canada Post API access
  return null;
}

/**
 * Fallback to a simple coordinate database for known postal codes
 * This helps with common postal codes that might fail with APIs
 */
function geocodeWithFallback(query: string): GeocodeResult | null {
  const cleanQuery = query.toUpperCase().replace(/\s+/g, "");

  // Known postal codes with their correct coordinates
  const knownPostalCodes: Record<string, { lat: number; lon: number }> = {
    // Toronto area (Ontario)
    "M1T3S6": { lat: 43.77715, lon: -79.320077 }, // Scarborough-Agincourt (Jean Yip's riding)
    "M1T3S5": { lat: 43.77715, lon: -79.320077 }, // Same area, should be Jean Yip
    "M1C5E9": { lat: 43.7089, lon: -79.3073 },     // Scarborough area
    "M5V3L8": { lat: 43.6456, lon: -79.3893 },     // Downtown Toronto
    "K1A0A6": { lat: 45.4215, lon: -75.6972 },     // Ottawa (Parliament)

    // Other Ontario areas
    "N2G1G6": { lat: 43.2558, lon: -80.2298 },     // Waterloo
    "L5V1N5": { lat: 43.5890, lon: -79.6441 },     // Mississauga
    "H3Z2Y9": { lat: 45.5017, lon: -73.5673 },     // Montreal (Quebec - for completeness)
  };

  const coords = knownPostalCodes[cleanQuery];
  if (coords) {
    return {
      lat: coords.lat,
      lon: coords.lon,
      source: "fallback"
    };
  }

  return null;
}

/**
 * Main hybrid geocoding function that uses region-specific services
 * Ontario: Alternative geocoding (Nominatim + fallbacks)
 * Outside Ontario: geocoder.ca (original approach)
 */
export async function geocodePostalCode(postalCode: string): Promise<GeocodeResult> {
  const cleanPostal = postalCode.toUpperCase().replace(/\s+/g, "");
  console.log(`[HybridGeocoder] Processing postal code: ${postalCode}`);

  // Check if it's an Ontario postal code
  const isOntario = isOntarioPostalCode(cleanPostal);
  console.log(`[HybridGeocoder] ${postalCode} is ${isOntario ? 'Ontario' : 'outside Ontario'} - using ${isOntario ? 'alternative geocoder' : 'geocoder.ca'}`);

  if (isOntario) {
    // Ontario: Use alternative geocoding (Nominatim + fallbacks)
    return await geocodeOntarioPostalCode(postalCode);
  } else {
    // Outside Ontario: Use geocoder.ca (original approach)
    return await geocodeNonOntarioPostalCode(postalCode);
  }
}

/**
 * Geocode Ontario postal codes using alternative methods
 * Priority: Nominatim -> Canada Post -> Fallback database
 */
async function geocodeOntarioPostalCode(postalCode: string): Promise<GeocodeResult> {
  const cleanPostal = postalCode.toUpperCase().replace(/\s+/g, "");

  // Try different query formats
  const queries = [
    cleanPostal,                                    // M1T3S6
    cleanPostal.slice(0, 3) + " " + cleanPostal.slice(3), // M1T 3S6
    cleanPostal.slice(0, 3) + "-" + cleanPostal.slice(3), // M1T-3S6
    postalCode                                      // Original format
  ];

  // 1. Try Nominatim first
  for (const query of queries) {
    const result = await geocodeWithNominatim(query);
    if (result) {
      console.log(`[HybridGeocoder] Ontario Nominatim success for ${postalCode}: ${result.lat}, ${result.lon}`);
      return result;
    }
  }

  // 2. Try Canada Post (if implemented)
  for (const query of queries) {
    const result = await geocodeWithCanadaPost(query);
    if (result) {
      console.log(`[HybridGeocoder] Ontario Canada Post success for ${postalCode}: ${result.lat}, ${result.lon}`);
      return result;
    }
  }

  // 3. Use fallback database for Ontario postal codes
  const fallbackResult = geocodeWithFallback(postalCode);
  if (fallbackResult) {
    console.log(`[HybridGeocoder] Ontario fallback used for ${postalCode}: ${fallbackResult.lat}, ${fallbackResult.lon}`);
    return fallbackResult;
  }

  // If all fail, throw error
  throw new Error(`Unable to geocode Ontario postal code: ${postalCode}`);
}

/**
 * Geocode non-Ontario postal codes using geocoder.ca
 * Uses the original geocoder.ca approach for consistency outside Ontario
 */
async function geocodeNonOntarioPostalCode(postalCode: string): Promise<GeocodeResult> {
  try {
    const result = await geocodeWithGeocoderCa(postalCode);
    if (result) {
      console.log(`[HybridGeocoder] Non-Ontario geocoder.ca success for ${postalCode}: ${result.lat}, ${result.lon}`);
      return result;
    }
  } catch (error) {
    console.warn(`[HybridGeocoder] geocoder.ca failed for ${postalCode}:`, error);
  }

  // Fallback to alternative methods if geocoder.ca fails
  console.log(`[HybridGeocoder] Falling back to alternative geocoding for ${postalCode}`);
  const cleanPostal = postalCode.toUpperCase().replace(/\s+/g, "");

  // Try Nominatim as fallback for non-Ontario
  const result = await geocodeWithNominatim(cleanPostal);
  if (result) {
    console.log(`[HybridGeocoder] Non-Ontario Nominatim fallback success for ${postalCode}: ${result.lat}, ${result.lon}`);
    return result;
  }

  // Final fallback check
  const fallbackResult = geocodeWithFallback(postalCode);
  if (fallbackResult) {
    console.log(`[HybridGeocoder] Non-Ontario fallback used for ${postalCode}: ${fallbackResult.lat}, ${fallbackResult.lon}`);
    return fallbackResult;
  }

  throw new Error(`Unable to geocode postal code: ${postalCode}`);
}

/**
 * Compare geocoder.ca vs alternative geocoder for a postal code
 * Useful for debugging and validation
 */
export async function compareGeocoders(postalCode: string): Promise<{
  geocoderCa: GeocodeResult | null;
  alternative: GeocodeResult | null;
}> {
  const results = {
    geocoderCa: null as GeocodeResult | null,
    alternative: null as GeocodeResult | null,
  };

  // Test geocoder.ca
  try {
    const spacedPostal = postalCode.slice(0, 3) + " " + postalCode.slice(3);
    const url = new URL("https://geocoder.ca/");
    url.searchParams.append("locate", spacedPostal);
    url.searchParams.append("json", "1");

    const response = await fetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      const lat = data.latt || data.lat;
      const lon = data.longt || data.long || data.lon;

      if (lat && lon) {
        results.geocoderCa = {
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          source: "geocoder.ca"
        };
      }
    }
  } catch (error) {
    console.warn("geocoder.ca failed:", error);
  }

  // Test alternative
  try {
    results.alternative = await geocodePostalCode(postalCode);
  } catch (error) {
    console.warn("Alternative geocoder failed:", error);
  }

  console.log(`[GeocoderCompare] Results for ${postalCode}:`, results);
  return results;
}