import type { Representative } from "@shared/schema";
import { makeRepresentativeId, __debugCheckRepId } from "./repId";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { logActivity } from "./storage/activityRepository";

/**
 * Enhanced Canadian postal code geocoding using Geocoder.ca
 * This is specifically designed for Canadian postal codes and is highly accurate
 */
async function geocodeCanadianPostalCode(postal: string): Promise<{lat: number, lng: number, city?: string, province?: string} | null> {
  const clean = postal.replace(/\s+/g, " ").trim().toUpperCase();

  try {
    const response = await fetch(`https://geocoder.ca/?locate=${encodeURIComponent(clean)}&json=1`, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0 - Canadian Government Data Integration'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoder.ca API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.latt && data.longt) {
      console.log(`[geocodeCanadianPostalCode] Success: ${data.latt}, ${data.longt}`);
      return {
        lat: parseFloat(data.latt),
        lng: parseFloat(data.longt),
        city: data.standard?.city,
        province: data.standard?.prov
      };
    }

    return null;
  } catch (error) {
    console.error('[geocodeCanadianPostalCode] Error:', error);
    return null;
  }
}

/**
 * Current federal representatives database (2024)
 * This would be updated periodically from official sources
 */
const CURRENT_FEDERAL_REPS = {
  "Scarborough—Rouge Park": {
    name: "Gary Anandasangaree",
    party: "Liberal",
    office: "MP",
    email: "gary.anandasangaree@parl.gc.ca",
    phone: "1 613 995-8423",
    photo: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/45/Anandasangaree_Gary_Lib.jpg"
  },
  "Scarborough—Guildwood": {
    name: "John McKay",
    party: "Liberal",
    office: "MP",
    email: "john.mckay@parl.gc.ca",
    phone: "1 613 992-6518",
    photo: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/McKay_John_Lib.jpg"
  },
  "Scarborough Southwest": {
    name: "Bill Blair",
    party: "Liberal",
    office: "MP",
    email: "bill.blair@parl.gc.ca",
    phone: "1 613 947-4555",
    photo: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Blair_Bill_Lib.jpg"
  }
};

/**
 * Current Ontario MPP database (2024)
 * This would be updated periodically from official sources
 */
const CURRENT_ONTARIO_MPPS = {
  "Scarborough—Rouge Park": {
    name: "Vijay Thanigasalam",
    party: "Progressive Conservative Party of Ontario",
    office: "MPP",
    email: "vijay.thanigasalam@pc.ola.org",
    phone: "416-283-1444"
  },
  "Scarborough—Guildwood": {
    name: "Mitzie Hunter",
    party: "Liberal",
    office: "MPP",
    email: "mhunter.mpp.co@liberal.ola.org",
    phone: "416-281-2234"
  },
  "Scarborough Southwest": {
    name: "Doly Begum",
    party: "New Democratic Party of Ontario",
    office: "MPP",
    email: "dbegum.mpp.co@ndp.on.ca",
    phone: "416-281-0610"
  }
};

/**
 * Federal riding boundaries (simplified mapping for demonstration)
 * In production, this would use official Elections Canada boundary files
 */
const FEDERAL_RIDING_BOUNDARIES = {
  // Toronto area ridings with approximate coordinate bounds
  "Scarborough—Rouge Park": {
    minLat: 43.75, maxLat: 43.80,
    minLng: -79.20, maxLng: -79.15
  },
  "Scarborough—Guildwood": {
    minLat: 43.70, maxLat: 43.77,
    minLng: -79.15, maxLng: -79.10
  },
  "Scarborough Southwest": {
    minLat: 43.65, maxLat: 43.72,
    minLng: -79.25, maxLng: -79.20
  }
};

/**
 * Determine federal riding from coordinates
 */
function getFederalRidingFromCoordinates(lat: number, lng: number): string | null {
  for (const [riding, bounds] of Object.entries(FEDERAL_RIDING_BOUNDARIES)) {
    if (lat >= bounds.minLat && lat <= bounds.maxLat &&
        lng >= bounds.minLng && lng <= bounds.maxLng) {
      return riding;
    }
  }
  return null;
}

/**
 * Get current federal MP for a riding
 */
function getCurrentFederalMP(riding: string): Representative | null {
  const repData = CURRENT_FEDERAL_REPS[riding];
  if (!repData) return null;

  const rep = {
    name: repData.name,
    party: repData.party,
    constituency: riding,
    province: "ON",
    electedOffice: repData.office,
    email: repData.email,
    phone: repData.phone,
    photo: repData.photo,
    website: `https://www.ourcommons.ca/en/members/${repData.name.toLowerCase().replace(/\s+/g, '-')}`,
    personalWebsite: undefined,
    socialMedia: {},
    biography: null,
    offices: [{
      type: "legislature",
      tel: repData.phone,
      postal: "House of Commons\nOttawa ON  K1A 0A6"
    }],
    fax: undefined,
    parliamentId: undefined,
    boundaryUrl: undefined,
    boundaryData: null,
    createdAt: undefined,
  };

  return rep as Representative;
}

/**
 * Get current Ontario MPP for a riding
 */
function getCurrentOntarioMPP(riding: string): Representative | null {
  const repData = CURRENT_ONTARIO_MPPS[riding];
  if (!repData) return null;

  const rep = {
    name: repData.name,
    party: repData.party,
    constituency: riding,
    province: "ON",
    electedOffice: repData.office,
    email: repData.email,
    phone: repData.phone,
    photo: undefined,
    website: "https://www.ola.org/en/members/current",
    personalWebsite: undefined,
    socialMedia: {},
    biography: null,
    offices: [{
      type: "constituency",
      tel: repData.phone,
      postal: "Legislative Building\nQueen's Park\nToronto ON  M7A 1A1"
    }],
    fax: undefined,
    parliamentId: undefined,
    boundaryUrl: undefined,
    boundaryData: null,
    createdAt: undefined,
  };

  return rep as Representative;
}

/**
 * Convert representative to our internal format with proper ID
 */
async function toRepresentativeWithId(rep: any, source: string): Promise<Representative> {
  const id = await makeRepresentativeId({
    source: source,
    elected_office: rep.electedOffice,
    name: rep.name,
    district_name: rep.constituency,
    province: rep.province,
    party_name: rep.party,
    email: rep.email,
  });

  const representative: Representative = {
    id: id as any,
    name: rep.name,
    party: rep.party || "Independent",
    constituency: rep.constituency,
    province: rep.province,
    electedOffice: rep.electedOffice,
    email: rep.email || undefined,
    phone: rep.phone || undefined,
    photo: rep.photo || undefined,
    website: rep.website || undefined,
    personalWebsite: rep.personalWebsite || undefined,
    socialMedia: rep.socialMedia || {},
    biography: rep.biography || null,
    offices: rep.offices || [],
    fax: rep.fax || undefined,
    parliamentId: rep.parliamentId || undefined,
    boundaryUrl: rep.boundaryUrl || undefined,
    boundaryData: rep.boundaryData || null,
    createdAt: rep.createdAt || undefined,
  } as unknown as Representative;

  __debugCheckRepId(representative.id as string);
  return representative;
}

/**
 * Main search function using Canadian government data sources
 */
export async function searchWithCanadianDataSources(postal: string, useCache: boolean = true): Promise<Representative[]> {
  const clean = postal.replace(/\s+/g, "").toUpperCase();

  // Try to get from cache first
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(`canadian_${clean}`);
    if (cached) {
      console.log(`[searchWithCanadianDataSources] Returning ${cached.length} cached Canadian representatives for ${clean}`);
      return cached;
    }
  }

  const results: Representative[] = [];

  try {
    console.log(`[searchWithCanadianDataSources] Searching with Canadian government data for ${clean}`);

    // 1. Geocode the postal code
    const coords = await geocodeCanadianPostalCode(clean);
    if (!coords) {
      throw new Error('Could not geocode postal code');
    }

    console.log(`[searchWithCanadianDataSources] Geocoded to: ${coords.city}, ${coords.province} (${coords.lat}, ${coords.lng})`);

    // 2. Determine federal riding from coordinates
    const federalRiding = getFederalRidingFromCoordinates(coords.lat, coords.lng);
    if (federalRiding) {
      console.log(`[searchWithCanadianDataSources] Found federal riding: ${federalRiding}`);

      // 3. Get federal MP
      const mpData = getCurrentFederalMP(federalRiding);
      if (mpData) {
        const mp = await toRepresentativeWithId(mpData, 'canadian-federal');
        results.push(mp);
        console.log(`[searchWithCanadianDataSources] Found MP: ${mpData.name} (${mpData.party})`);
      }

      // 4. Get Ontario MPP (if in Ontario)
      if (coords.province === 'ON') {
        const mppData = getCurrentOntarioMPP(federalRiding);
        if (mppData) {
          const mpp = await toRepresentativeWithId(mppData, 'canadian-ontario');
          results.push(mpp);
          console.log(`[searchWithCanadianDataSources] Found MPP: ${mppData.name} (${mppData.party})`);
        }
      }
    }

    // 5. Fallback to Represent API only for municipal officials
    if (results.length > 0) {
      try {
        const { fetchRepsByPostal } = await import('./representApi');
        const municipalReps = await fetchRepsByPostal(clean, false);

        const municipalOnly = municipalReps.filter(rep =>
          rep.electedOffice === 'Mayor' ||
          rep.electedOffice === 'Councillor' ||
          rep.electedOffice === 'Regional Chair'
        );

        results.push(...municipalOnly);
        console.log(`[searchWithCanadianDataSources] Added ${municipalOnly.length} municipal representatives`);
      } catch (municipalError) {
        console.warn('[searchWithCanadianDataSources] Municipal fallback failed:', municipalError);
      }
    }

    // Cache the results
    if (useCache && results.length > 0) {
      await searchCacheRepository.cacheSearch(`canadian_${clean}`, results);
      console.log(`[searchWithCanadianDataSources] Cached ${results.length} Canadian representatives for ${clean}`);
    }

    // Log activity
    await logActivity({
      type: "search",
      query: clean,
      searchType: "official",
      ts: Date.now(),
      representatives: results,
    });

    return results;

  } catch (error) {
    console.error('[searchWithCanadianDataSources] Error:', error);

    // Fallback to enhanced Represent API search
    console.log('[searchWithCanadianDataSources] Falling back to enhanced Represent API search');
    try {
      const { fetchRepsByPostalEnhanced } = await import('./representApi');
      return await fetchRepsByPostalEnhanced(clean, useCache);
    } catch (fallbackError) {
      console.error('[searchWithCanadianDataSources] All methods failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Update representative databases (would be called periodically)
 * This function would be used to update the local databases from official sources
 */
export async function updateRepresentativeDatabases(): Promise<void> {
  console.log('[updateRepresentativeDatabases] This would update from official government sources');
  // In production, this would:
  // 1. Fetch current MPs from House of Commons data
  // 2. Fetch current MPPs from provincial legislature websites
  // 3. Fetch boundary data from Elections Canada
  // 4. Update local database/files
  // 5. Update timestamp for cache invalidation
}