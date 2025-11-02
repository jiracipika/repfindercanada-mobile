import type { Representative } from "@shared/schema";
import { makeRepresentativeId, __debugCheckRepId } from "./repId";
import { searchCacheRepository } from "./storage/searchCacheRepository";
import { logActivity } from "./storage/activityRepository";

// Official government data sources
const OFFICIAL_SOURCES = {
  // Federal: House of Commons
  HOUSE_OF_COMMONS: {
    baseUrl: "https://www.ourcommons.ca",
    membersApi: "https://www.ourcommons.ca/members/en/search?caucusId=all&province=all",
    searchByPostal: "https://www.ourcommons.ca/members/en/postalsearch?postal="
  },

  // Provincial: Ontario Legislative Assembly
  ONTARIO_LEG: {
    baseUrl: "https://www.ola.org",
    membersList: "https://www.ola.org/en/members/current"
  },

  // Geocoding fallback
  NOMINATIM: {
    baseUrl: "https://nominatim.openstreetmap.org",
    search: "/search"
  },

  // Keep Represent as municipal fallback only
  REPRESENT_FALLBACK: {
    baseUrl: "https://represent.opennorth.ca"
  }
};

// Federal riding to province mapping (current 338 ridings)
const FEDERAL_RIDING_PROVINCES = {
  "NL": ["Avalon", "Bonavista—Burin—Trinity", "Coast of Bays—Central—Notre Dame", "Carpenter—Cartier—Lac-Saint-Louis", "Conception Bay—Southlands—Bell Island", "Corner Brook—Deer Lake—St. Barbe", "Humber River—Black Creek", "Labrador", "Long Range Mountains", "St. John's East", "St. John's South—Mount Pearl"],
  "PE": ["Cardigan", "Charlottetown", "Egmont", "Malpeque", "Prince Edward Island"],
  "NS": ["Acadie—Bathurst", "Cape Breton—Canso", "Central Nova", "Cumberland—Colchester", "Dartmouth—Cole Harbour", "Halifax", "Halifax West", "Kings—Hants", "Sydney—Victoria", "Sackville—Preston—Chezzetcook", "South Shore—St. Margaret's", "West Nova"],
  "NB": ["Acadie—Bathurst", "Beauséjour", "Fredericton", "Fundy Royal", "Madawaska—Restigouche", "Miramichi—Grand Lake", "Moncton—Riverview—Dieppe", "New Brunswick Southwest", "Saint John—Rothesay", "Tobique—Mactaquac"],
  "QC": ["Abitibi—Baie-James—Nunavik—Eeyou", "Abitibi—Témiscamingue", "Ahuntsic", "Alfred-Pellan", "Argenteuil—La Petite-Nation", "Avignon—La Mitis—Matane—Matapédia", "Beauce", "Bécancour—Nicolet—Saurel", "Bellechasse—Les Etchemins—Lévis", "Berthier—Maskinongé", "Bourassa", "Brome—Missisquoi", "Brossard—Saint-Lambert", "Chambly—Borduas", "Charlesbourg—Haute-Saint-Charles", "Châteauguay", "Chicoutimi—Le Fjord", "Châteauguay—Saint-Constant", "Compton—Stanstead", "Davenport", "Don Valley East", "Don Valley North", "Don Valley West", "Dorval—Lachine—LaSalle", "Drummond", "Gaspésie—Les Îles-de-la-Madeleine", "Gatineau", "Glengarry—Prescott—Russell", "Guelph", "Hull—Aylmer", "Humber River—Black Creek", "Joliette", "Jonquière", "Kamouraska—Rivière-du-Loup—Témiscouata—Les Basques", "Kitchener Centre", "Kitchener South—Hespeler", "Lac-Saint-Louis", "Lac-Saint-Jean", "La Prairie", "LaSalle—Émard—Verdun", "Laurentides—Labelle", "Laurier—Sainte-Marie", "Laval—Les Îles", "Lévis—Lotbinière—Chutes-de-la-Chaudière", "Longueuil—Charles-LeMoyne", "Longueuil—Saint-Hubert", "Louis-Hébert", "Louis-Saint-Laurent", "Manicouagan", "Marc-Aurèle-Fortin", "Marie-Victorin", "Mégantic—L'Érable", "Mirabel", "Montcalm", "Montmagny—L'Islet—Kamouraska—Rivière-du-Loup", "Mount Royal", "Notre-Dame-de-Grâce—Westmount", "Ottawa—Vanier", "Ottawa West—Nepean", "Outremont", "Papineau", "Pierre-Boucher—Les Patriotes—Verchères", "Pierrefonds—Dollard", "Pontiac", "Portneuf—Jacques-Cartier", "Québec", "Richmond—Arthabaska", "Rivière-des-Mille-Îles", "Rivière-du-Nord", "Rivière-des-Mille-Îles", "Rosemont—La Petite-Patrie", "Saint-Hyacinthe—Bagot", "Saint-Jean", "Saint-Laurent", "Saint-Léonard—Saint-Michel", "Saint-Maurice—Champlain", "Salaberry—Suroît", "Saskatoon West", "Sault Ste. Marie", "Sault Ste. Marie", "Scarborough—Agincourt", "Scarborough Centre", "Scarborough—Guildwood", "Scarborough North", "Scarborough—Rouge Park", "Scarborough Southwest", "Scheer", "Schreiber", "Skeena—Bulkley Valley", "Souris—Moose Mountain", "Spadina—Fort York", "St. Albert", "St. Catharines", "St. John's East", "St. John's South—Mount Pearl", "St. Paul's", "Steinbach", "Stormont—Dundas—South Glengarry", "Surrey—Newton", "Surrey Centre", "Sydney—Victoria", "Témiscamingue", "Terrebonne", "Thornhill", "Thunder Bay—Rainy River", "Thunder Bay—Superior North", "Timiskaming—Cochrane", "Toronto Centre", "Toronto—Danforth", "Toronto—St. Paul's", "Tracy", "Trois-Rivières", "Vancouver Centre", "Vancouver East", "Vancouver Kingsway", "Vancouver Quadra", "Vancouver South", "Vaughan", "Verdun—Saint-Henri—Saint-Paul—Pointe-Claire", "Victoire", "Vimy", "Wellington—Halton Hills", "West Nova", "West Vancouver—Sunshine Coast—Sea to Sky Country", "Whitby", "Windsor West", "Winnipeg Centre", "Winnipeg North", "Winnipeg South", "Windsor—Tecumseh", "Winnipeg South Centre", "York Centre", "York—Simcoe", "York West", "Yukon"]
};

interface OfficialRepresentative {
  name: string;
  elected_office: string;
  district_name: string;
  province: string;
  party_name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  website?: string;
  personalWebsite?: string;
  offices?: Array<{
    type?: string;
    tel?: string;
    fax?: string;
    postal?: string;
  }>;
  source: string;
  sourceUrl?: string;
}

/**
 * Search federal MP by postal code using official House of Commons data
 */
async function searchFederalMPByPostal(postal: string): Promise<OfficialRepresentative | null> {
  try {
    // Use House of Commons postal code search
    const response = await fetch(`${OFFICIAL_SOURCES.HOUSE_OF_COMMONS.searchByPostal}${postal}`, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`House of Commons API error: ${response.status}`);
    }

    // Parse the HTML response to extract MP information
    const html = await response.text();

    // Extract MP information from the page (this is a simplified approach)
    // In production, you'd want more robust HTML parsing
    const mpMatch = html.match(/class="member-profile"[\s\S]*?<h2[^>]*>([^<]+)<\/h2>[\s\S]*?class="riding"[^>]*>([^<]+)<\/div>/);

    if (mpMatch) {
      const name = mpMatch[1].trim();
      const riding = mpMatch[2].trim();

      // Extract additional details like party, email, etc.
      const partyMatch = html.match(/class="party"[^>]*>([^<]+)<\/div>/);
      const emailMatch = html.match(/href="mailto:([^"]+)"/);
      const photoMatch = html.match(/class="member-photo"[^>]*src="([^"]+)"/);

      return {
        name,
        elected_office: "MP",
        district_name: riding,
        province: extractProvinceFromRiding(riding),
        party_name: partyMatch ? partyMatch[1].trim() : "Independent",
        email: emailMatch ? emailMatch[1] : undefined,
        photo_url: photoMatch ? new URL(photoMatch[1], OFFICIAL_SOURCES.HOUSE_OF_COMMONS.baseUrl).href : undefined,
        website: `${OFFICIAL_SOURCES.HOUSE_OF_COMMONS.baseUrl}/members/en/search`,
        source: "House of Commons",
        sourceUrl: `${OFFICIAL_SOURCES.HOUSE_OF_COMMONS.searchByPostal}${postal}`
      };
    }

    return null;
  } catch (error) {
    console.error('[searchFederalMPByPostal] Error:', error);
    return null;
  }
}

/**
 * Search Ontario MPP by riding name using official OLA data
 */
async function searchOntarioMPPByRiding(riding: string): Promise<OfficialRepresentative | null> {
  try {
    // Use Ontario Legislative Assembly member list
    const response = await fetch(OFFICIAL_SOURCES.ONTARIO_LEG.membersList, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Ontario Legislative API error: ${response.status}`);
    }

    const html = await response.text();

    // This is a simplified approach - in production, you'd parse the HTML more robustly
    // or look for official JSON/API endpoints
    const mppMatch = html.match(new RegExp(`${riding.replace(/[—–]/g, '[-‑]')}[\\s\\S]*?<td[^>]*class="name"[^>]*>([^<]+)</td>[\\s\\S]*?<td[^>]*class="party"[^>]*>([^<]+)</td>`, 'i'));

    if (mppMatch) {
      const name = mppMatch[1].trim();
      const party = mppMatch[2].trim();

      return {
        name,
        elected_office: "MPP",
        district_name: riding,
        province: "ON",
        party_name: party,
        website: OFFICIAL_SOURCES.ONTARIO_LEG.membersList,
        source: "Ontario Legislative Assembly",
        sourceUrl: OFFICIAL_SOURCES.ONTARIO_LEG.membersList
      };
    }

    return null;
  } catch (error) {
    console.error('[searchOntarioMPPByRiding] Error:', error);
    return null;
  }
}

/**
 * Geocode postal code to coordinates using Nominatim (OpenStreetMap)
 */
async function geocodePostalCode(postal: string): Promise<{lat: number, lng: number} | null> {
  try {
    const query = `${postal}, Canada`;
    const response = await fetch(
      `${OFFICIAL_SOURCES.NOMINATIM.baseUrl}${OFFICIAL_SOURCES.NOMINATIM.search}?` +
      new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 1,
        countrycodes: 'ca'
      }),
      {
        headers: {
          'User-Agent': 'CanadianRepFinder/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
    }

    return null;
  } catch (error) {
    console.error('[geocodePostalCode] Error:', error);
    return null;
  }
}

/**
 * Extract province from federal riding name
 */
function extractProvinceFromRiding(riding: string): string {
  for (const [province, ridings] of Object.entries(FEDERAL_RIDING_PROVINCES)) {
    if (ridings.some(r => riding.toLowerCase().includes(r.toLowerCase()))) {
      return province;
    }
  }

  // Fallback to common patterns
  if (riding.toLowerCase().includes('toronto') || riding.toLowerCase().includes('scarborough') ||
      riding.toLowerCase().includes('north york') || riding.toLowerCase().includes('etobicoke')) {
    return 'ON';
  }

  if (riding.toLowerCase().includes('montréal') || riding.toLowerCase().includes('quebec')) {
    return 'QC';
  }

  if (riding.toLowerCase().includes('vancouver') || riding.toLowerCase().includes('victoria')) {
    return 'BC';
  }

  return 'CA'; // Default to Canada if can't determine
}

/**
 * Convert official representative to our internal format
 */
async function toRepresentativeFromOfficial(official: OfficialRepresentative): Promise<Representative> {
  const id = await makeRepresentativeId({
    source: "official-government",
    elected_office: official.elected_office,
    name: official.name,
    district_name: official.district_name,
    province: official.province,
    party_name: official.party_name,
    email: official.email,
  });

  const representative: Representative = {
    id: id as any,
    name: official.name,
    party: official.party_name || "Independent",
    constituency: official.district_name,
    province: official.province,
    electedOffice: official.elected_office,
    email: official.email || undefined,
    phone: official.phone || undefined,
    photo: official.photo_url || undefined,
    website: official.website || undefined,
    personalWebsite: official.personalWebsite || undefined,
    socialMedia: {},
    biography: null,
    offices: official.offices || [],
    fax: official.offices?.[0]?.fax || undefined,
    parliamentId: undefined,
    boundaryUrl: undefined,
    boundaryData: null,
    createdAt: undefined,
  } as unknown as Representative;

  __debugCheckRepId(representative.id as string);
  return representative;
}

/**
 * Enhanced search using official government data sources
 */
export async function searchRepresentativesOfficial(postal: string, useCache: boolean = true): Promise<Representative[]> {
  const clean = postal.replace(/\s+/g, "").toUpperCase();

  // Try to get from cache first if enabled
  if (useCache) {
    const cached = await searchCacheRepository.getCachedSearch(`official_${clean}`);
    if (cached) {
      console.log(`[searchRepresentativesOfficial] Returning ${cached.length} cached official representatives for ${clean}`);
      return cached;
    }
  }

  const results: Representative[] = [];

  try {
    console.log(`[searchRepresentativesOfficial] Searching with official data sources for ${clean}`);

    // 1. Search for federal MP using House of Commons
    const mp = await searchFederalMPByPostal(clean);
    if (mp) {
      const mpRep = await toRepresentativeFromOfficial(mp);
      results.push(mpRep);
      console.log(`[searchRepresentativesOfficial] Found MP: ${mp.name} (${mp.party_name})`);
    }

    // 2. If we found an MP, search for corresponding provincial representative
    if (mp && mp.province === 'ON') {
      const mpp = await searchOntarioMPPByRiding(mp.district_name);
      if (mpp) {
        const mppRep = await toRepresentativeFromOfficial(mpp);
        results.push(mppRep);
        console.log(`[searchRepresentativesOfficial] Found MPP: ${mpp.name} (${mpp.party_name})`);
      }
    }

    // 3. Fallback to Represent API only for municipal officials
    if (results.length > 0) {
      try {
        const { fetchRepsByPostal } = await import('./representApi');
        const municipalReps = await fetchRepsByPostal(clean, false); // Don't cache municipal fallback

        // Only add municipal-level representatives
        const municipalOnly = municipalReps.filter(rep =>
          rep.electedOffice === 'Mayor' ||
          rep.electedOffice === 'Councillor' ||
          rep.electedOffice === 'Regional Chair'
        );

        results.push(...municipalOnly);
        console.log(`[searchRepresentativesOfficial] Added ${municipalOnly.length} municipal representatives from Represent API`);
      } catch (municipalError) {
        console.warn('[searchRepresentativesOfficial] Municipal fallback failed:', municipalError);
      }
    }

    // Cache the results
    if (useCache && results.length > 0) {
      await searchCacheRepository.cacheSearch(`official_${clean}`, results);
      console.log(`[searchRepresentativesOfficial] Cached ${results.length} official representatives for ${clean}`);
    }

    // Log the official data search activity
    await logActivity({
      type: "search",
      query: clean,
      searchType: "official",
      ts: Date.now(),
      representatives: results,
    });

    return results;

  } catch (error) {
    console.error('[searchRepresentativesOfficial] Error:', error);

    // Final fallback to Represent API
    console.log('[searchRepresentativesOfficial] Falling back to Represent API');
    try {
      const { fetchRepsByPostal } = await import('./representApi');
      return await fetchRepsByPostal(clean, useCache);
    } catch (fallbackError) {
      console.error('[searchRepresentativesOfficial] All methods failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Get coordinates for postal code with multiple fallback methods
 */
export async function getPostalCodeCoordinates(postal: string): Promise<{lat: number, lng: number} | null> {
  // Try geocoding first
  const coords = await geocodePostalCode(postal);
  if (coords) {
    return coords;
  }

  // Fallback to Represent API for coordinates
  try {
    const { postalCodeToCoordinates } = await import('./representApi');
    const representCoords = await postalCodeToCoordinates(postal);
    return {
      lat: representCoords.latitude,
      lng: representCoords.longitude
    };
  } catch (error) {
    console.error('[getPostalCodeCoordinates] All coordinate methods failed:', error);
    return null;
  }
}