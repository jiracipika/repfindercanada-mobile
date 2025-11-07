/**
 * R-based geocoding and representative search functionality
 * Converted from R to TypeScript for better Canadian postal code support
 * Exact implementation matching the R code
 */

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




// Small util to dedupe arrays by a key function
function dedupeBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

/**
 * Get precise representatives for a location or postal code.
 * - If you pass a custom getCoords(query, contactEmail) -> { latitude, longitude, source } it will use that first.
 * - Otherwise it falls back to OpenNorth's postcode centroid.
 *
 * Converted from JavaScript to TypeScript, maintaining exact logic
 */
export async function getRepsFromAddress(
  queryOrPostal: string,
  opts: {
    contactEmail?: string;
    getCoords?: (q: string, contactEmail?: string) => Promise<{ latitude: number; longitude: number; source?: string }>;
  } = {}
): Promise<Representative[]> {
  const contactEmail = opts.contactEmail ?? "you@example.com";
  const getCoords = opts.getCoords;

  // --- Helpers ---
  const ua = (headers: Record<string, string> = {}) => ({
    "User-Agent": "JS reps precise",
    "Accept": "application/json",
    ...headers
  });

  const fetchJSON = async (url: string): Promise<any> => {
    const res = await fetch(url, { headers: ua() });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
  };

  const nullish = (v: any, d: string = "") => (v == null ? d : v);

  // --- 1) Geocode to coordinates (prefer provided getCoords; else Geocoder.ca) ---
  async function geocodeToPoint(q: string) {
    if (typeof getCoords === "function") {
      const df = await getCoords(q, contactEmail);
      if (!df || df.latitude == null || df.longitude == null) {
        throw new Error("getCoords() did not return latitude/longitude.");
      }
      return {
        lat: Number(df.latitude),
        lon: Number(df.longitude),
        source: df.source ?? "getCoords"
      };
    }

    // Fallback: Geocoder.ca API (Canada-focused) - try spaced format first
    const pc = q.toUpperCase().replace(/\s+/g, "");
    const spacedPostal = pc.slice(0, 3) + " " + pc.slice(3);

    const url = new URL("https://geocoder.ca/");
    url.searchParams.append("locate", spacedPostal);
    url.searchParams.append("json", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "JS reps precise",
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoder.ca: HTTP ${response.status}`);
    }

    const data = await response.json();

    // Geocoder.ca returns different field names
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
  }

  const gc = await geocodeToPoint(queryOrPostal);
  const lat = gc.lat, lon = gc.lon, src = gc.source;

  // --- 2) Fetch representatives by coordinate (try lat,lon then lon,lat) ---
  async function fetchRepsByPoint(lat: number, lon: number) {
    const urls = [
      `https://represent.opennorth.ca/representatives/?point=${lat.toFixed(7)},${lon.toFixed(7)}`,
      `https://represent.opennorth.ca/representatives/?point=${lon.toFixed(7)},${lat.toFixed(7)}`
    ];
    for (const u of urls) {
      try {
        const j = await fetchJSON(u);
        if (j?.objects && Array.isArray(j.objects) && j.objects.length) {
          return j.objects;
        }
      } catch {
        // try next
      }
    }
    return null;
  }

  const objs = await fetchRepsByPoint(lat, lon);
  if (!objs) throw new Error("OpenNorth didn't return representatives for that point.");

  // --- 3) Keep only current reps (drop ones with end_date present) ---
  const current = objs.filter(o => {
    const end = nullish(o.end_date, "").trim();
    return end === "";
  });

  // --- 4) Classify level & filter buckets ---
  function classifyLevel(setName: string, office: string): Representative["level"] {
    const s = nullish(setName, "");
    const o = nullish(office, "");

    // Federal
    if (/(House of Commons|Parliament|Chambre des communes)/i.test(s) || /^MP$/i.test(o)) {
      return "Federal";
    }
    // Provincial/Territorial
    if (/(Legislative Assembly|Assemblée législative|National Assembly|Assemblée nationale|House of Assembly)/i.test(s) ||
        /\b(MPP|MLA|MNA|MHA)\b/i.test(o)) {
      return "Provincial/Territorial";
    }
    // Municipal
    if (/(City|Town|Municipal|Regional|District|Ville|Conseil|Council)/i.test(s) ||
        /(Mayor|Councillor|Alderman|Reeve)/i.test(o)) {
      return "Municipal";
    }
    return "Other";
  }

  const withLevel = current.map(o => ({
    ...o,
    level: classifyLevel(o.representative_set_name, o.elected_office)
  }));

  const pickOne = (arr: any[]) => (arr && arr.length ? [arr[0]] : []);

  // Federal: exactly one from House of Commons
  const federal = pickOne(
    withLevel
      .filter(o => o.level === "Federal" && /(House of Commons|Chambre des communes)/i.test(nullish(o.representative_set_name)))
      .sort((a, b) => nullish(a.name).localeCompare(nullish(b.name)))
  );

  // Provincial/Territorial: one from Legislative/National/House of Assembly
  const provincial = pickOne(
    withLevel
      .filter(o =>
        o.level === "Provincial/Territorial" &&
        /(Legislative|National Assembly|House of Assembly)/i.test(nullish(o.representative_set_name))
      )
      .sort((a, b) => nullish(a.name).localeCompare(nullish(b.name)))
  );

  // Municipal: mayor + ward councillor from city council set; exclude school boards/regions
  const muniCandidates = withLevel
    .filter(o => o.level === "Municipal")
    .filter(o => /(City|Ville|Council|Conseil)/i.test(nullish(o.representative_set_name)))
    .filter(o => !/(School|École|School Board|Regional|Comté|County|District School)/i.test(nullish(o.representative_set_name)));

  const mayor = pickOne(muniCandidates.filter(o => /(Mayor|Maire)/i.test(nullish(o.elected_office))));
  const ward  = pickOne(muniCandidates.filter(o => /(Councillor|Conseiller|Alderman|Reeve)/i.test(nullish(o.elected_office))));
  const municipal = dedupeBy([...mayor, ...ward], (o) => `${o.name}|${o.elected_office}|${o.representative_set_name}`);

  // --- 5) Build output ---
  const levelOrder: Record<string, number> = { "Federal": 1, "Provincial/Territorial": 2, "Municipal": 3 };

  const out = [...federal, ...provincial, ...municipal]
    .filter(Boolean)
    .map(o => ({
      level: o.level,
      name: nullish(o.name),
      riding: o.district_name,
      affiliation: o.party_name,
      office: o.elected_office,
      rep_set: o.representative_set_name,
      latitude: lat,
      longitude: lon,
      coord_source: src
    }))
    .filter(o => o.level)
    .sort((a, b) => {
      const lv = (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99);
      if (lv !== 0) return lv;
      // then office, then name (both optional-safe)
      const oCmp = nullish(a.office).localeCompare(nullish(b.office));
      if (oCmp !== 0) return oCmp;
      return nullish(a.name).localeCompare(nullish(b.name));
    });

  const results: Representative[] = dedupeBy(out, (o) => `${o.level}|${o.office}|${o.name}|${o.riding}`);

  return results;
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