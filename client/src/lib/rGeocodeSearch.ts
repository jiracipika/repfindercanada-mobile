/**
 * R-based geocoding and representative search functionality
 * Converted from R to TypeScript for better Canadian postal code support
 * Exact implementation matching the R code
 */

// Constants for API requests
const getUserAgent = (contactEmail: string): string => `napas-postal-lookup/1.0 (${contactEmail})`;

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
 * Exact match to R code implementation
 */
async function geocodeGeocoderCa(query: string, contactEmail: string): Promise<GeocodeResult> {
  const pc = query.toUpperCase().replace(/\s+/g, "");

  const url = new URL("https://geocoder.ca/");
  url.searchParams.append("locate", pc);
  url.searchParams.append("json", "1");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": getUserAgent(contactEmail),
    },
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
 * Exact match to R code implementation
 */
async function geocodeNominatim(query: string, contactEmail: string): Promise<GeocodeResult> {
  const ua = getUserAgent(contactEmail);
  const pc = query.toUpperCase().replace(/\s+/g, "");

  // Strategy A: postalcode param (works if query is a PC)
  const url1 = new URL("https://nominatim.openstreetmap.org/search");
  url1.searchParams.append("format", "jsonv2");
  url1.searchParams.append("postalcode", pc);
  url1.searchParams.append("countrycodes", "ca");
  url1.searchParams.append("limit", "1");
  url1.searchParams.append("addressdetails", "0");

  const response1 = await fetch(url1.toString(), {
    method: "GET",
    headers: {
      "User-Agent": ua,
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

  // Strategy B: free-text address
  const url2 = new URL("https://nominatim.openstreetmap.org/search");
  url2.searchParams.append("format", "jsonv2");
  url2.searchParams.append("q", `${query} Canada`);
  url2.searchParams.append("limit", "1");
  url2.searchParams.append("addressdetails", "0");

  const response2 = await fetch(url2.toString(), {
    method: "GET",
    headers: {
      "User-Agent": ua,
      "Accept": "application/json",
    },
  });

  if (!response2.ok) {
    throw new Error(`nominatim: API error ${response2.status}`);
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
 * Exact match to R code implementation
 */
async function fetchRepsByPoint(lat: number, lon: number): Promise<any[]> {
  // Try both lat,lon and lon,lat just in case
  const urls = [
    `https://represent.opennorth.ca/representatives/?point=${lat.toFixed(7)},${lon.toFixed(7)}`,
    `https://represent.opennorth.ca/representatives/?point=${lon.toFixed(7)},${lat.toFixed(7)}`,
  ];

  for (const url of urls) {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "R civic reps by point",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.objects && Array.isArray(data.objects) && data.objects.length > 0) {
        return data.objects;
      }
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
 * Main function: Get representatives from address/postal code
 * Exact match to R code implementation
 */
export async function getRepsFromAddress(
  query: string,
  contactEmail: string = "you@example.com"
): Promise<Representative[]> {
  // ---------- 1) Geocode the input ----------
  let gc: GeocodeResult;

  try {
    gc = await geocodeGeocoderCa(query, contactEmail);
  } catch (error) {
    gc = await geocodeNominatim(query, contactEmail);
  }

  const { lat, lon, source } = gc;

  // ---------- 2) OpenNorth reps by coordinate (point=lat,lon) ----------
  const objects = await fetchRepsByPoint(lat, lon);
  if (objects.length === 0) {
    throw new Error("OpenNorth did not return representatives for that coordinate.");
  }

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
  const uniqueResults = Array.from(
    new Set(results.map(r => `${r.name}|${r.riding}|${r.level}`))
  ).map(uniqueKey =>
    results.find(r => `${r.name}|${r.riding}|${r.level}` === uniqueKey)!
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