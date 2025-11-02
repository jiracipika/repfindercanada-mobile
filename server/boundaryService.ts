/**
 * Boundary Data Service
 * Handles fetching electoral district boundaries from Statistics Canada and other sources
 */

export interface BoundaryData {
  type: string;
  geometry: any;
  properties: {
    name: string;
    nameEn?: string;
    nameFr?: string;
    province?: string;
    fedNum?: string; // Federal electoral district number
  };
}

/**
 * Fetches boundary GeoJSON from Elections Canada 2023 Representation Order
 * Updated to use official 2023 boundaries (343 ridings) instead of 2013 (338 ridings)
 */
export async function getBoundaryFromStatCan(fedNum: string): Promise<BoundaryData | null> {
  try {
    // Elections Canada ESRI REST service for 2023 Representation Order
    // Federal Electoral Districts (2023 - 343 ridings)
    const wfsUrl = new URL('https://maps-cartes.services.geo.ca/server_serveur/rest/services/ELECTIONS/FED_CA_2023_106_en/MapServer/0/query');

    wfsUrl.searchParams.set('where', `FEDNUM='${fedNum}'`);
    wfsUrl.searchParams.set('outFields', '*');
    wfsUrl.searchParams.set('returnGeometry', 'true');
    wfsUrl.searchParams.set('f', 'geojson');

    console.log(`Fetching boundary from Elections Canada 2023 for FED ${fedNum}`);

    const response = await fetch(wfsUrl.toString(), {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Elections Canada API error: ${response.status}`);
    }

    const geoJson = await response.json();

    if (geoJson.features && geoJson.features.length > 0) {
      return geoJson.features[0];
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching boundary from Elections Canada:`, error?.message || String(error));
    return null;
  }
}

/**
 * Fetches boundary by riding name from Elections Canada 2023 Representation Order
 * Uses name-based lookup when FED number is not available
 */
export async function getBoundaryByRidingName(ridingName: string, province?: string): Promise<BoundaryData | null> {
  try {
    const wfsUrl = new URL('https://maps-cartes.services.geo.ca/server_serveur/rest/services/ELECTIONS/FED_CA_2023_106_en/MapServer/0/query');

    // Build where clause - Elections Canada 2023 API uses ENNAME field
    let whereClause = `ENNAME='${ridingName.replace(/'/g, "''")}'`; // Escape single quotes
    if (province) {
      // Province code field in 2023 API (check actual field name if needed)
      whereClause += ` AND PROVCODE='${province}'`;
    }

    wfsUrl.searchParams.set('where', whereClause);
    wfsUrl.searchParams.set('outFields', '*');
    wfsUrl.searchParams.set('returnGeometry', 'true');
    wfsUrl.searchParams.set('f', 'geojson');

    console.log(`Fetching boundary from Elections Canada 2023 for riding: ${ridingName}`);

    const response = await fetch(wfsUrl.toString(), {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Elections Canada API error: ${response.status}`);
    }

    const geoJson = await response.json();

    if (geoJson.features && geoJson.features.length > 0) {
      return geoJson.features[0];
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching boundary by name from Elections Canada:`, error?.message || String(error));
    return null;
  }
}

/**
 * Fetches simplified boundary shape from Represent API (fallback)
 * Used when Elections Canada data is unavailable
 * NOTE: Represent API may have outdated/incorrect postal code mappings for 2023 boundaries
 */
export async function getBoundaryFromRepresent(boundaryUrl: string): Promise<any | null> {
  try {
    // Ensure boundaryUrl starts with /
    if (!boundaryUrl.startsWith('/')) {
      boundaryUrl = '/' + boundaryUrl;
    }

    const shapeUrl = `https://represent.opennorth.ca${boundaryUrl}simple_shape`;
    console.log(`Fetching boundary from Represent API: ${shapeUrl}`);

    const response = await fetch(shapeUrl, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status}`);
    }

    const geoJson = await response.json();
    return geoJson;
  } catch (error: any) {
    console.error(`Error fetching boundary from Represent:`, error?.message || String(error));
    return null;
  }
}

/**
 * Hybrid boundary fetch with fallbacks
 * Tries Elections Canada 2023 API first, falls back to Represent API
 */
export async function getBoundaryData(
  ridingName: string,
  province?: string,
  representBoundaryUrl?: string
): Promise<any | null> {
  // Try Elections Canada 2023 API first
  let boundary = await getBoundaryByRidingName(ridingName, province);

  if (boundary) {
    console.log(`Using Elections Canada 2023 boundary for ${ridingName}`);
    return boundary;
  }

  // Fallback to Represent API if we have a boundary URL
  if (representBoundaryUrl) {
    console.log(`Falling back to Represent API for ${ridingName}`);
    boundary = await getBoundaryFromRepresent(representBoundaryUrl);
  }

  return boundary;
}

/**
 * Get simplified centroid and extent from boundary URL
 * Lightweight metadata without full GeoJSON
 */
export async function getBoundaryMetadata(boundaryUrl: string): Promise<{
  centroid: { lat: number; lng: number };
  extent: [number, number, number, number]; // [west, south, east, north]
} | null> {
  try {
    // Ensure boundaryUrl starts with /
    if (!boundaryUrl.startsWith('/')) {
      boundaryUrl = '/' + boundaryUrl;
    }

    const metadataUrl = `https://represent.opennorth.ca${boundaryUrl}`;
    console.log(`Fetching boundary metadata: ${metadataUrl}`);

    const response = await fetch(metadataUrl, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.centroid && data.extent) {
      return {
        centroid: {
          lat: data.centroid.coordinates[1],
          lng: data.centroid.coordinates[0],
        },
        extent: data.extent,
      };
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching boundary metadata:`, error?.message || String(error));
    return null;
  }
}
