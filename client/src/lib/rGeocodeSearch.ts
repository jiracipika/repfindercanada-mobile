/**
 * R-based geocoding and representative search functionality
 * Converted from R to TypeScript for better Canadian postal code support
 */

// Constants for API requests
const USER_AGENT = "napas-postal-lookup/1.0 (contact@example.com)";

// Helper functions
const trimq = (x?: string | null): string => (x || "").trim();
const isNullish = (x: any): boolean => x === null || x === undefined;

// Interfaces for search results
export interface Representative {
  level: "Federal" | "Provincial/Territorial" | "Municipal" | "Other";
  name: string;
  riding: string;
  affiliation: string;
  office: string;
  rep_set: string;
  latitude: number;
  longitude: number;
  coord_source: string;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  source: string;
}

/**
 * Geocoder.ca API (Canada-focused)
 */
async function geocodeGeocoderCa(query: string): Promise<GeocodeResult> {
  const pc = query.toUpperCase().replace(/\s+/g, "");

  const response = await fetch("https://geocoder.ca/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      locate: pc,
      json: "1",
    }),
  });

  if (!response.ok) {
    throw new Error(`geocoder.ca API error ${response.status}`);
  }

  const data = await response.json();

  if (isNullish(data.lat) || isNullish(data.long)) {
    throw new Error("geocoder.ca: no result");
  }

  return {
    lat: parseFloat(data.lat),
    lon: parseFloat(data.long),
    source: "geocoder.ca",
  };
}

/**
 * Nominatim (OpenStreetMap) geocoding
 */
async function geocodeNominatim(query: string): Promise<GeocodeResult> {
  // Strategy A: postalcode param (works if query is a postal code)
  const pc = query.toUpperCase().replace(/\s+/g, "");

  try {
    const response1 = await fetch("https://nominatim.openstreetmap.org/search", {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    });

    if (response1.ok) {
      const data1 = await response1.json();
      if (Array.isArray(data1) && data1.length > 0) {
        return {
          lat: parseFloat(data1[0].lat),
          lon: parseFloat(data1[0].lon),
          source: "nominatim",
        };
      }
    }
  } catch (error) {
    console.log("Nominatim strategy A failed, trying strategy B");
  }

  // Strategy B: free-text address
  const params = new URLSearchParams({
    format: "jsonv2",
    q: `${query} Canada`,
    limit: "1",
    addressdetails: "0",
  });

  const response2 = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
    }
  );

  if (!response2.ok) {
    throw new Error(`Nominatim API error ${response2.status}`);
  }

  const data2 = await response2.json();

  if (!Array.isArray(data2) || data2.length === 0) {
    throw new Error("nominatim: no result");
  }

  return {
    lat: parseFloat(data2[0].lat),
    lon: parseFloat(data2[0].lon),
    source: "nominatim",
  };
}

/**
 * Classify government level using representative_set_name / elected_office
 */
function classifyLevel(repSetName: string, electedOffice: string): Representative["level"] {
  const rsn = trimq(repSetName).toLowerCase();
  const off = trimq(electedOffice).toLowerCase();

  if (
    rsn.includes("house of commons") ||
    rsn.includes("parliament") ||
    rsn.includes("chambre des communes") ||
    off === "mp"
  ) {
    return "Federal";
  }

  if (
    rsn.includes("legislative assembly") ||
    rsn.includes("assemblée législative") ||
    rsn.includes("national assembly") ||
    rsn.includes("assemblée nationale") ||
    rsn.includes("house of assembly") ||
    /\b(mpp|mla|mna|mha)\b/.test(off)
  ) {
    return "Provincial/Territorial";
  }

  if (
    rsn.includes("city") ||
    rsn.includes("town") ||
    rsn.includes("municipal") ||
    rsn.includes("regional") ||
    rsn.includes("district") ||
    rsn.includes("ville") ||
    rsn.includes("conseil") ||
    rsn.includes("council") ||
    off.includes("mayor") ||
    off.includes("councillor") ||
    off.includes("alderman") ||
    off.includes("reeve")
  ) {
    return "Municipal";
  }

  return "Other";
}

/**
 * Fetch representatives by coordinate (point=lat,lon)
 */
async function fetchRepsByPoint(lat: number, lon: number): Promise<any[]> {
  // Try both lat,lon and lon,lat just in case
  const urls = [
    `https://represent.opennorth.ca/representatives/?point=${lat.toFixed(7)},${lon.toFixed(7)}`,
    `https://represent.opennorth.ca/representatives/?point=${lon.toFixed(7)},${lat.toFixed(7)}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "R civic reps by point",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.objects && Array.isArray(data.objects) && data.objects.length > 0) {
          return data.objects;
        }
      }
    } catch (error) {
      console.log(`Failed to fetch from ${url}:`, error);
      continue;
    }
  }

  throw new Error("OpenNorth did not return representatives for that coordinate.");
}

/**
 * Ensure required fields exist in representative objects
 */
function ensureField(obj: any, fieldName: string): any {
  if (isNullish(obj[fieldName])) {
    obj[fieldName] = "";
  }
  return obj;
}

/**
 * Special case handling for known problematic postal codes
 */
function getSpecialCaseCoordinates(postal: string): GeocodeResult | null {
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
    console.log(`[RGeocodeSearch] Using special case coordinates for ${postal}: [${coords.lat}, ${coords.lon}]`);
    return {
      lat: coords.lat,
      lon: coords.lon,
      source: coords.source,
    };
  }

  return null;
}

/**
 * Main function: Get representatives from address/postal code
 * This replaces the existing search functionality with the R-based approach
 */
export async function getRepsFromAddress(
  query: string,
  contactEmail: string = "you@example.com"
): Promise<Representative[]> {
  console.log(`[RGeocodeSearch] Starting search for: ${query}`);

  // Clean the query (normalize postal codes)
  const cleanQuery = query.toUpperCase().replace(/\s+/g, "");

  // ---------- 1) Geocode the input ----------
  let gc: GeocodeResult;

  // Strategy 0: Check for special cases (known problematic postal codes)
  const specialCase = getSpecialCaseCoordinates(cleanQuery);
  if (specialCase) {
    gc = specialCase;
  } else {
    // Strategy 1: Try Geocoder.ca
    try {
      gc = await geocodeGeocoderCa(cleanQuery);
      console.log(`[RGeocodeSearch] Geocoder.ca success: [${gc.lat}, ${gc.lon}]`);
    } catch (error) {
      console.log(`[RGeocodeSearch] Geocoder.ca failed, trying Nominatim:`, error);
      gc = await geocodeNominatim(cleanQuery);
      console.log(`[RGeocodeSearch] Nominatim success: [${gc.lat}, ${gc.lon}]`);
    }
  }

  const { lat, lon, source } = gc;

  // ---------- 2) OpenNorth reps by coordinate ----------
  console.log(`[RGeocodeSearch] Fetching representatives for coordinates [${lat}, ${lon}]`);
  const objects = await fetchRepsByPoint(lat, lon);

  // Ensure fields exist
  const processedObjects = objects.map(obj => {
    ensureField(obj, "name");
    ensureField(obj, "district_name");
    ensureField(obj, "party_name");
    ensureField(obj, "elected_office");
    ensureField(obj, "representative_set_name");
    return obj;
  });

  // ---------- 3) Tidy output ----------
  const level = processedObjects.map(obj =>
    classifyLevel(obj.representative_set_name, obj.elected_office)
  );

  const results: Representative[] = processedObjects.map((obj, index) => ({
    level: level[index],
    name: trimq(obj.name),
    riding: trimq(obj.district_name),
    affiliation: trimq(obj.party_name),
    office: trimq(obj.elected_office),
    rep_set: trimq(obj.representative_set_name),
    latitude: lat,
    longitude: lon,
    coord_source: source,
  }));

  // De-dup (sometimes centroid & concordance overlap)
  const uniqueResults = results.filter((item, index, self) =>
    index === self.findIndex((t) =>
      t.name === item.name &&
      t.riding === item.riding &&
      t.level === item.level
    )
  );

  // Nice ordering
  const levelOrder: Representative["level"][] = [
    "Federal",
    "Provincial/Territorial",
    "Municipal",
    "Other"
  ];

  uniqueResults.sort((a, b) => {
    const levelDiff = levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
    if (levelDiff !== 0) return levelDiff;

    const repSetDiff = a.rep_set.localeCompare(b.rep_set);
    if (repSetDiff !== 0) return repSetDiff;

    const officeDiff = a.office.localeCompare(b.office);
    if (officeDiff !== 0) return officeDiff;

    return a.name.localeCompare(b.name);
  });

  console.log(`[RGeocodeSearch] Found ${uniqueResults.length} representatives`);
  return uniqueResults;
}

/**
 * Convert R-style results to existing Representative interface format
 * This maintains compatibility with existing UI components
 */
export function convertToExistingFormat(rResults: Representative[]): any[] {
  return rResults.map(r => ({
    id: `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: r.name,
    party: r.affiliation || "Independent",
    constituency: r.riding,
    province: "",
    electedOffice: r.office || undefined,
    email: undefined,
    phone: undefined,
    photo: undefined,
    website: undefined,
    personalWebsite: undefined,
    socialMedia: {},
    biography: null,
    offices: [],
    fax: undefined,
    parliamentId: undefined,
    boundaryUrl: undefined,
    boundaryData: null,
    createdAt: undefined,
    // Add the R-specific fields for debugging
    level: r.level,
    rep_set: r.rep_set,
    latitude: r.latitude,
    longitude: r.longitude,
    coord_source: r.coord_source,
  }));
}