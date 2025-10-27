/**
 * House of Commons Data Service
 *
 * PRIMARY DATA SOURCE (DB Primary)
 * Fetches official MP data from ourcommons.ca XML feeds
 *
 * Data Flow:
 * 1. PRIMARY: House of Commons XML (server-side fetch, no CORS)
 *    - Source: https://www.ourcommons.ca/Members/en/search/xml
 *    - Contains: MP names, ridings, parties, provinces, email, photos
 *    - Cached for 24 hours
 *
 * 2. SECONDARY: Represent API (used for postal code→riding lookup only)
 *    - Source: https://represent.opennorth.ca
 *    - Used for: Postal code to riding mapping
 *    - Falls back for: Missing contact information
 *
 * 3. TERTIARY: Web scraping (for detailed contact info)
 *    - Source: ourcommons.ca MP profile pages
 *    - Used for: Constituency offices, phone numbers
 *
 * All data fetching is SERVER-SIDE to avoid CORS issues.
 */

import { parseStringPromise } from 'xml2js';

export interface HouseOfCommonsMP {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  honorific: string;
  constituency: string;
  province: string;
  party: string;
  caucus: string;
  fromDate: string;
  toDate?: string;
  email?: string;
  photoUrl?: string;
  profileUrl?: string;
}

// Cache for House of Commons data
let hocMPsCache: HouseOfCommonsMP[] = [];
let hocCacheTimestamp = 0;
const HOC_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Expected number of ridings based on 2023 Representation Order
const EXPECTED_RIDING_COUNT_2023 = 343;

/**
 * Fetches all current MPs from House of Commons XML feeds
 * Source: https://www.ourcommons.ca/Members/en/search/xml
 */
export async function getAllMPsFromHouseOfCommons(): Promise<HouseOfCommonsMP[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (hocMPsCache.length > 0 && (now - hocCacheTimestamp) < HOC_CACHE_DURATION) {
    console.log(`Returning ${hocMPsCache.length} MPs from House of Commons cache`);
    return hocMPsCache;
  }

  try {
    console.log('Fetching MPs from House of Commons XML feed...');

    // The House of Commons provides an XML feed with all current members
    // Format: https://www.ourcommons.ca/Members/en/search/xml
    const response = await fetch('https://www.ourcommons.ca/Members/en/search/xml', {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0',
        'Accept': 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`House of Commons XML feed error: ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();
    const parsed = await parseStringPromise(xmlData, {
      explicitArray: false,
      trim: true,
    });

    // Parse the XML structure
    // Expected structure: <ArrayOfMemberOfParliament><MemberOfParliament>...</MemberOfParliament>...</ArrayOfMemberOfParliament>
    const members = Array.isArray(parsed.ArrayOfMemberOfParliament?.MemberOfParliament)
      ? parsed.ArrayOfMemberOfParliament.MemberOfParliament
      : [parsed.ArrayOfMemberOfParliament?.MemberOfParliament].filter(Boolean);

    if (!members || members.length === 0) {
      throw new Error('No members found in House of Commons XML feed');
    }

    hocMPsCache = members.map((member: any) => {
      // Extract ID from PersonShortHonorific or use a generated ID
      const id = member.PersonId || member.PersonShortHonorific?.PersonId || '';

      return {
        id: String(id),
        name: member.PersonOfficialFirstName && member.PersonOfficialLastName
          ? `${member.PersonOfficialFirstName} ${member.PersonOfficialLastName}`.trim()
          : member.Name || '',
        firstName: member.PersonOfficialFirstName || '',
        lastName: member.PersonOfficialLastName || '',
        honorific: member.PersonShortHonorific?.Title || '',
        constituency: member.ConstituencyName || member.CaucusShortName?.ConstituencyName || '',
        province: member.ConstituencyProvinceTerritoryName || '',
        party: member.CaucusShortName?._ || member.CaucusShortName || '',
        caucus: member.CaucusShortName?._ || member.CaucusShortName || '',
        fromDate: member.FromDateTime || member.FromDate || '',
        toDate: member.ToDateTime || member.ToDate || undefined,
        email: member.Email || `${member.PersonOfficialFirstName?.toLowerCase()}.${member.PersonOfficialLastName?.toLowerCase()}@parl.gc.ca`,
        photoUrl: member.PhotoUrl || undefined,
        profileUrl: id ? `https://www.ourcommons.ca/members/en/${member.PersonOfficialFirstName}-${member.PersonOfficialLastName}(${id})` : undefined,
      };
    });

    hocCacheTimestamp = now;
    console.log(`Successfully fetched ${hocMPsCache.length} MPs from House of Commons`);

    // Validate riding count matches 2023 Representation Order
    if (hocMPsCache.length !== EXPECTED_RIDING_COUNT_2023) {
      console.warn(
        `⚠️  WARNING: Expected ${EXPECTED_RIDING_COUNT_2023} ridings (2023 Representation Order), ` +
        `but found ${hocMPsCache.length}. ` +
        `This may indicate missing data or incorrect parliament session.`
      );
    } else {
      console.log(`✓ Validated: ${hocMPsCache.length} ridings match 2023 Representation Order`);
    }

    return hocMPsCache;
  } catch (error: any) {
    console.error('Error fetching House of Commons data:', error?.message || String(error));

    // If cache exists but is stale, return it anyway
    if (hocMPsCache.length > 0) {
      console.log('Returning stale House of Commons cache due to fetch error');
      return hocMPsCache;
    }

    throw error;
  }
}

/**
 * Find an MP by riding name
 */
export async function getMPByRiding(ridingName: string): Promise<HouseOfCommonsMP | null> {
  const allMPs = await getAllMPsFromHouseOfCommons();
  const normalizedSearch = ridingName.toLowerCase().trim();

  return allMPs.find(mp =>
    mp.constituency.toLowerCase().trim() === normalizedSearch
  ) || null;
}

/**
 * Find MPs by name (partial match)
 */
export async function searchMPsByName(name: string): Promise<HouseOfCommonsMP[]> {
  const allMPs = await getAllMPsFromHouseOfCommons();
  const normalizedSearch = name.toLowerCase().trim();

  return allMPs.filter(mp =>
    mp.name.toLowerCase().includes(normalizedSearch) ||
    mp.firstName.toLowerCase().includes(normalizedSearch) ||
    mp.lastName.toLowerCase().includes(normalizedSearch)
  );
}

/**
 * Get MP by parliament ID
 */
export async function getMPById(id: string): Promise<HouseOfCommonsMP | null> {
  const allMPs = await getAllMPsFromHouseOfCommons();
  return allMPs.find(mp => mp.id === id) || null;
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearHouseOfCommonsCache() {
  hocMPsCache = [];
  hocCacheTimestamp = 0;
}
