/**
 * Radar Geocoding Service Helper
 * Server-side geocoding using Radar API for Canadian postal codes
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  confidence?: number;
  source: 'radar';
}

export interface RadarGeocodeResponse {
  meta: {
    code: number;
    message: string;
  };
  addresses: Array<{
    latitude: number;
    longitude: number;
    formattedAddress?: string;
    confidence?: number;
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
  }>;
}

/**
 * Get coordinates from Canadian postal code using Radar's forward geocoding API
 * @param postalCode Canadian postal code (e.g., "M1C 5E9" or "M1C5E9")
 * @returns Promise<GeocodeResult> Coordinates and address info
 * @throws Error if geocoding fails or no results found
 */
export async function getCoordinatesFromPostalCode(postalCode: string): Promise<GeocodeResult> {
  // Validate environment variable
  const radarSecretKey = process.env.RADAR_SECRET_KEY;
  if (!radarSecretKey) {
    throw new Error('RADAR_SECRET_KEY environment variable is required');
  }

  // Clean and validate postal code
  const cleanPostalCode = postalCode.trim().toUpperCase().replace(/\s+/g, '');

  // Basic Canadian postal code validation
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleanPostalCode)) {
    throw new Error(`Invalid Canadian postal code format: ${postalCode}`);
  }

  // Format for Radar API (add space for better results)
  const formattedPostalCode = cleanPostalCode.slice(0, 3) + ' ' + cleanPostalCode.slice(3);

  try {
    console.log(`[RadarGeocoder] Geocoding postal code: ${formattedPostalCode}`);

    const query = encodeURIComponent(`${formattedPostalCode}, Canada`);
    const radarUrl = `https://api.radar.io/v1/geocode/forward?query=${query}`;

    const response = await fetch(radarUrl, {
      method: 'GET',
      headers: {
        'Authorization': radarSecretKey,
        'Content-Type': 'application/json',
        'User-Agent': 'CanadianRepFinder/3.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Radar API error: ${response.status} ${response.statusText}`);
    }

    const data: RadarGeocodeResponse = await response.json();

    // Check if Radar API returned success
    if (data.meta.code !== 200) {
      throw new Error(`Radar API error: ${data.meta.message}`);
    }

    // Check if we got any addresses
    if (!data.addresses || data.addresses.length === 0) {
      throw new Error(`No geocoding results found for postal code: ${formattedPostalCode}`);
    }

    const result = data.addresses[0]; // Use first (most relevant) result

    // Validate coordinates
    if (!result.latitude || !result.longitude) {
      throw new Error(`Invalid coordinates returned for postal code: ${formattedPostalCode}`);
    }

    const geocodeResult: GeocodeResult = {
      latitude: result.latitude,
      longitude: result.longitude,
      formattedAddress: result.formattedAddress,
      confidence: result.confidence,
      source: 'radar'
    };

    console.log(`[RadarGeocoder] Success for ${formattedPostalCode}:`, {
      lat: geocodeResult.latitude,
      lon: geocodeResult.longitude,
      confidence: geocodeResult.confidence,
      address: geocodeResult.formattedAddress
    });

    return geocodeResult;

  } catch (error) {
    console.error(`[RadarGeocoder] Failed to geocode ${formattedPostalCode}:`, error);

    if (error instanceof Error) {
      // Re-throw known errors
      throw error;
    }

    // Wrap unknown errors
    throw new Error(`Geocoding failed for postal code: ${formattedPostalCode}`);
  }
}

/**
 * Validate that a result looks like a Canadian geocode result
 * @param result Geocode result to validate
 * @returns boolean true if valid for Canadian location
 */
function validateCanadianResult(result: any): boolean {
  return (
    result &&
    typeof result.latitude === 'number' &&
    typeof result.longitude === 'number' &&
    result.latitude >= 41.67 && // Southern Canada border
    result.latitude <= 83.11 && // Northern Canada border
    result.longitude >= -141.0 && // Western Canada border
    result.longitude <= -52.6 // Eastern Canada border
  );
}