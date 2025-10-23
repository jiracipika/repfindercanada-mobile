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
 * Fetches boundary GeoJSON from Statistics Canada WMS service
 * This is more reliable than Represent API for official boundaries
 */
export async function getBoundaryFromStatCan(fedNum: string): Promise<BoundaryData | null> {
  try {
    // Statistics Canada WFS (Web Feature Service) for 2021 Census boundaries
    // Federal Electoral Districts (2013 Representation Order)
    const wfsUrl = new URL('https://geoappext.nrcan.gc.ca/arcgis/rest/services/FGP/electoral_boundaries_en/MapServer/0/query');

    wfsUrl.searchParams.set('where', `FED_NUM='${fedNum}'`);
    wfsUrl.searchParams.set('outFields', '*');
    wfsUrl.searchParams.set('returnGeometry', 'true');
    wfsUrl.searchParams.set('f', 'geojson');

    console.log(`Fetching boundary from StatCan for FED ${fedNum}`);

    const response = await fetch(wfsUrl.toString(), {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`StatCan WFS error: ${response.status}`);
    }

    const geoJson = await response.json();

    if (geoJson.features && geoJson.features.length > 0) {
      return geoJson.features[0];
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching boundary from StatCan:`, error?.message || String(error));
    return null;
  }
}

/**
 * Fetches boundary by riding name from Statistics Canada
 * Uses name-based lookup when FED number is not available
 */
export async function getBoundaryByRidingName(ridingName: string, province?: string): Promise<BoundaryData | null> {
  try {
    const wfsUrl = new URL('https://geoappext.nrcan.gc.ca/arcgis/rest/services/FGP/electoral_boundaries_en/MapServer/0/query');

    // Build where clause
    let whereClause = `ENNAME='${ridingName.replace(/'/g, "''")}'`; // Escape single quotes
    if (province) {
      whereClause += ` AND PROVCODE='${province}'`;
    }

    wfsUrl.searchParams.set('where', whereClause);
    wfsUrl.searchParams.set('outFields', '*');
    wfsUrl.searchParams.set('returnGeometry', 'true');
    wfsUrl.searchParams.set('f', 'geojson');

    console.log(`Fetching boundary from StatCan for riding: ${ridingName}`);

    const response = await fetch(wfsUrl.toString(), {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`StatCan WFS error: ${response.status}`);
    }

    const geoJson = await response.json();

    if (geoJson.features && geoJson.features.length > 0) {
      return geoJson.features[0];
    }

    return null;
  } catch (error: any) {
    console.error(`Error fetching boundary by name from StatCan:`, error?.message || String(error));
    return null;
  }
}

/**
 * Fetches simplified boundary shape from Represent API (fallback)
 * Used when StatCan data is unavailable
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
 * Tries StatCan first, falls back to Represent API
 */
export async function getBoundaryData(
  ridingName: string,
  province?: string,
  representBoundaryUrl?: string
): Promise<any | null> {
  // Try StatCan first
  let boundary = await getBoundaryByRidingName(ridingName, province);

  if (boundary) {
    console.log(`Using StatCan boundary for ${ridingName}`);
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
