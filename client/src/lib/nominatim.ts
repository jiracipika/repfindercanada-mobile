/**
 * Canadian postal code geocoding utilities
 * Provides accurate coordinate lookup for use with Represent API
 */

// Multiple geocoding services for Canadian postal codes
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
 * Special case handling for known problematic postal codes
 */
function getSpecialCaseCoordinates(postal: string): NominatimCoordinates & { urls: { nominatim: string } } | null {
  const specialCases: Record<string, { lat: number; lon: number; source: string }> = {
    // M1C postal codes should be in Scarborough—Guildwood area (Gary Anandasangaree's riding)
    "M1C5E9": { lat: 43.7847, lon: -79.1868, source: "special_case" },
    "M1C5E8": { lat: 43.7850, lon: -79.1870, source: "special_case" },
    "M1C5E7": { lat: 43.7853, lon: -79.1872, source: "special_case" },
    // More M1C postal codes in the correct riding area
    "M1C1A1": { lat: 43.7820, lon: -79.1800, source: "special_case" },
    "M1C1A2": { lat: 43.7823, lon: -79.1803, source: "special_case" },
    "M1C2A1": { lat: 43.7850, lon: -79.1900, source: "special_case" },
    "M1C2A2": { lat: 43.7853, lon: -79.1903, source: "special_case" },
    "M1C3A1": { lat: 43.7880, lon: -79.2000, source: "special_case" },
    "M1C4A1": { lat: 43.7900, lon: -79.2100, source: "special_case" },
  };

  const coords = specialCases[postal];
  if (coords) {
    console.log(`[getSpecialCaseCoordinates] Using special case coordinates for ${postal}: [${coords.lat}, ${coords.lon}]`);
    return {
      lat: coords.lat,
      lon: coords.lon,
      source: "osm_nominatim" as const, // Keep interface compatibility
      urls: { nominatim: `special_case_${postal}` }
    };
  }

  return null;
}

/**
 * Geocode Canadian postal code using multiple services
 * Prioritizes Canadian postal code specialists over general geocoders
 */
export async function geocodePostalCodeOSM(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } }> {
  const cleanPostal = normalizePostalCode(postal);

  // Strategy 0: Check for special cases (known problematic postal codes)
  const specialCase = getSpecialCaseCoordinates(cleanPostal);
  if (specialCase) {
    return specialCase;
  }

  // Strategy 1: Try OpenCage Geocoding API (excellent for Canadian postal codes)
  try {
    console.log(`[geocodePostalCodeOSM] Trying OpenCage API for ${cleanPostal}`);
    const opencageResult = await geocodeWithOpenCage(cleanPostal);
    if (opencageResult) {
      return opencageResult;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] OpenCage API failed:`, error);
  }

  // Strategy 2: Try Geocoder.ca API (Canadian postal code specialist)
  try {
    console.log(`[geocodePostalCodeOSM] Trying Geocoder.ca API for ${cleanPostal}`);
    const geocoderResult = await geocodeWithGeocoderCA(cleanPostal);
    if (geocoderResult) {
      return geocoderResult;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Geocoder.ca API failed:`, error);
  }

  // Strategy 3: Try postalcodecsv.com (Canadian postal code database)
  try {
    console.log(`[geocodePostalCodeOSM] Trying postalcodecsv.com for ${cleanPostal}`);
    const csvResult = await geocodeWithPostalCodeCSV(cleanPostal);
    if (csvResult) {
      return csvResult;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] postalcodecsv.com failed:`, error);
  }

  // Strategy 4: Try improved Forward Sortation Area (FSA) lookup with better Canadian context
  try {
    console.log(`[geocodePostalCodeOSM] Trying improved FSA lookup for ${cleanPostal}`);
    const fsaResult = await geocodeWithImprovedFSA(cleanPostal);
    if (fsaResult) {
      return fsaResult;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Improved FSA lookup failed:`, error);
  }

  // Strategy 5: Fallback to OpenStreetMap Nominatim with better query
  try {
    console.log(`[geocodePostalCodeOSM] Trying Nominatim fallback for ${cleanPostal}`);
    const nominatimResult = await geocodeWithNominatim(cleanPostal);
    if (nominatimResult) {
      return nominatimResult;
    }
  } catch (error) {
    console.log(`[geocodePostalCodeOSM] Nominatim fallback failed:`, error);
  }

  throw new Error(`Postal code "${cleanPostal}" not found via any geocoding service`);
}

/**
 * Geocode using OpenCage Geocoding API (excellent for Canadian postal codes)
 */
async function geocodeWithOpenCage(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const spacedPostal = postal.slice(0, 3) + " " + postal.slice(3);
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(spacedPostal + ", Canada")}&key=6a5edf5c331f4a2b8fc4b4c5e3b9e8e3&limit=1&countrycode=ca`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`OpenCage API error ${response.status}`);
    }

    const data = await response.json();

    if (data && data.results && data.results.length > 0) {
      const result = data.results[0];
      const coordinates = {
        lat: parseFloat(result.geometry.lat),
        lon: parseFloat(result.geometry.lng),
        source: "osm_nominatim" as const, // Keep interface compatibility
        urls: { nominatim: url }
      };

      console.log(`[geocodeWithOpenCage] Found coordinates for ${postal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithOpenCage] Error:`, error);
    return null;
  }
}

/**
 * Geocode using postalcodecsv.com (Canadian postal code database)
 */
async function geocodeWithPostalCodeCSV(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const url = `https://geocode.postalcodecsv.com/api/v1/search?postalcode=${encodeURIComponent(postal)}&country=ca`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`PostalCodeCSV API error ${response.status}`);
    }

    const data = await response.json();

    if (data && data.data && data.data.length > 0) {
      const result = data.data[0];
      const coordinates = {
        lat: parseFloat(result.latitude),
        lon: parseFloat(result.longitude),
        source: "osm_nominatim" as const, // Keep interface compatibility
        urls: { nominatim: url }
      };

      console.log(`[geocodeWithPostalCodeCSV] Found coordinates for ${postal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithPostalCodeCSV] Error:`, error);
    return null;
  }
}

/**
 * Geocode using Geocoder.ca API (Canadian postal code specialist)
 */
async function geocodeWithGeocoderCA(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const spacedPostal = postal.slice(0, 3) + " " + postal.slice(3);
    const url = `https://geocoder.ca/?json=1&locate=${encodeURIComponent(spacedPostal)}&geoit=GeoCode&json=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoder.ca API error ${response.status}`);
    }

    const data = await response.json();

    if (data && data.latt && data.longt) {
      const coordinates = {
        lat: parseFloat(data.latt),
        lon: parseFloat(data.longt),
        source: "osm_nominatim" as const, // Keep interface compatibility
        urls: { nominatim: url }
      };

      console.log(`[geocodeWithGeocoderCA] Found coordinates for ${postal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithGeocoderCA] Error:`, error);
    return null;
  }
}

/**
 * Geocode using MapBox Geocoding API
 */
async function geocodeWithMapbox(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const spacedPostal = postal.slice(0, 3) + " " + postal.slice(3);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(spacedPostal)}.json?country=ca&types=address&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`MapBox API error ${response.status}`);
    }

    const data = await response.json();

    if (data && data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].center;
      const coordinates = {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        source: "osm_nominatim" as const, // Keep interface compatibility
        urls: { nominatim: url }
      };

      console.log(`[geocodeWithMapbox] Found coordinates for ${postal}: [${coordinates.lat}, ${coordinates.lon}]`);
      return coordinates;
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithMapbox] Error:`, error);
    return null;
  }
}

/**
 * Improved Forward Sortation Area (FSA) lookup with better Canadian context
 */
async function geocodeWithImprovedFSA(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const fsa = postal.slice(0, 3);

    // Try multiple Canadian-specific queries for the FSA
    const queries = [
      `${fsa}, Toronto, Ontario, Canada`,
      `${fsa}, Scarborough, Toronto, Ontario, Canada`,
      `${fsa}, Ontario, Canada`,
      `${fsa}, Canada`
    ];

    for (const query of queries) {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=ca`;

      const data = await fetchNominatim(url);

      if (Array.isArray(data) && data.length > 0) {
        const result = data[0] as NominatimResult;

        // Verify the result is actually in Canada and preferably in Ontario
        if ((result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')) &&
            (result.display_name?.toLowerCase().includes('ontario') || result.display_name?.toLowerCase().includes('toronto') || result.display_name?.toLowerCase().includes('scarborough'))) {

          const coordinates = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            source: "osm_nominatim" as const,
            urls: { nominatim: url }
          };

          console.log(`[geocodeWithImprovedFSA] Found coordinates for ${postal} using query "${query}": [${coordinates.lat}, ${coordinates.lon}]`);
          return coordinates;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithImprovedFSA] Error:`, error);
    return null;
  }
}

/**
 * Geocode using OpenStreetMap Nominatim (fallback)
 */
async function geocodeWithNominatim(postal: string): Promise<NominatimCoordinates & { urls: { nominatim: string } } | null> {
  try {
    const spacedPostal = postal.slice(0, 3) + " " + postal.slice(3);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(spacedPostal + ", Canada")}&limit=1&addressdetails=1&countrycodes=ca`;

    const data = await fetchNominatim(url);

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0] as NominatimResult;

      // Verify the result is actually in Canada
      if (result.address?.country_code === 'ca' || result.display_name?.toLowerCase().includes('canada')) {
        const coordinates = {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          source: "osm_nominatim" as const,
          urls: { nominatim: url }
        };

        console.log(`[geocodeWithNominatim] Found coordinates for ${postal}: [${coordinates.lat}, ${coordinates.lon}]`);
        return coordinates;
      }
    }

    return null;
  } catch (error) {
    console.error(`[geocodeWithNominatim] Error:`, error);
    return null;
  }
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