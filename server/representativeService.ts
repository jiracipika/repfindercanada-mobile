/**
 * Representative Service
 * Combines bundled MP data with scraped contact information
 */

import { lookupMPByPostalCode } from './improvedPostalCodeService';
import { getAllMPs, searchMPsByName } from './bundledDataLoader';
import { scrapeMPContactInfo, type MPContactInfo } from './mpContactScraper';
import type { HouseOfCommonsMP } from './houseOfCommonsService';

export interface CompleteRepresentative {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  honorific?: string;
  constituency: string;
  province: string;
  party: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  profileUrl?: string;
  offices?: Array<{
    type: 'Hill' | 'Constituency';
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
  }>;
  contactInfo?: MPContactInfo;
  dataSource: 'bundled' | 'bundled+scraped';
}

// Cache for scraped contact info (1 day)
const contactInfoCache = new Map<string, { info: MPContactInfo; timestamp: number }>();
const CONTACT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Convert HouseOfCommonsMP to CompleteRepresentative
 */
function mpToRepresentative(mp: HouseOfCommonsMP): CompleteRepresentative {
  return {
    id: mp.id,
    name: mp.name,
    firstName: mp.firstName,
    lastName: mp.lastName,
    honorific: mp.honorific,
    constituency: mp.constituency,
    province: mp.province,
    party: mp.party,
    email: mp.email,
    photoUrl: mp.photoUrl,
    profileUrl: mp.profileUrl,
    dataSource: 'bundled',
  };
}

/**
 * Enrich a representative with scraped contact information
 */
async function enrichWithContactInfo(rep: CompleteRepresentative): Promise<CompleteRepresentative> {
  if (!rep.profileUrl) {
    return rep;
  }

  // Check cache first
  const cached = contactInfoCache.get(rep.id);
  if (cached && (Date.now() - cached.timestamp) < CONTACT_CACHE_DURATION) {
    console.log(`[RepresentativeService] Using cached contact info for ${rep.name}`);
    return {
      ...rep,
      contactInfo: cached.info,
      offices: cached.info.offices,
      phone: cached.info.phone || rep.phone,
      email: cached.info.email || rep.email,
      photoUrl: cached.info.photoUrl || rep.photoUrl,
      dataSource: 'bundled+scraped',
    };
  }

  // Scrape contact info
  try {
    console.log(`[RepresentativeService] Scraping contact info for ${rep.name}...`);
    const contactInfo = await scrapeMPContactInfo(rep.profileUrl);

    if (contactInfo) {
      // Cache the result
      contactInfoCache.set(rep.id, { info: contactInfo, timestamp: Date.now() });

      return {
        ...rep,
        contactInfo,
        offices: contactInfo.offices,
        phone: contactInfo.phone || rep.phone,
        email: contactInfo.email || rep.email,
        photoUrl: contactInfo.photoUrl || rep.photoUrl,
        dataSource: 'bundled+scraped',
      };
    }
  } catch (error: any) {
    console.warn(`[RepresentativeService] Failed to scrape contact info for ${rep.name}:`, error?.message);
  }

  return rep;
}

/**
 * Search for MP by postal code
 */
export async function searchByPostalCode(
  postalCode: string,
  includeContactInfo = true
): Promise<CompleteRepresentative | null> {
  console.log(`[RepresentativeService] Searching by postal code: ${postalCode}`);

  const result = await lookupMPByPostalCode(postalCode);

  if (!result || !result.mp) {
    return null;
  }

  let rep = mpToRepresentative(result.mp);

  if (includeContactInfo) {
    rep = await enrichWithContactInfo(rep);
  }

  return rep;
}

/**
 * Search for MPs by name
 */
export async function searchByName(
  name: string,
  includeContactInfo = false
): Promise<CompleteRepresentative[]> {
  console.log(`[RepresentativeService] Searching by name: ${name}`);

  const mps = searchMPsByName(name);
  let reps = mps.map(mpToRepresentative);

  // Only enrich first result with contact info to avoid overwhelming the scraper
  if (includeContactInfo && reps.length > 0) {
    reps[0] = await enrichWithContactInfo(reps[0]);
  }

  return reps;
}

/**
 * Get all MPs (without contact info to avoid long load times)
 */
export function getAllRepresentatives(): CompleteRepresentative[] {
  console.log('[RepresentativeService] Getting all representatives');
  const mps = getAllMPs();
  return mps.map(mpToRepresentative);
}

/**
 * Get a single MP with full contact info
 */
export async function getRepresentativeById(
  id: string,
  includeContactInfo = true
): Promise<CompleteRepresentative | null> {
  const allMPs = getAllMPs();
  const mp = allMPs.find(m => m.id === id);

  if (!mp) {
    return null;
  }

  let rep = mpToRepresentative(mp);

  if (includeContactInfo) {
    rep = await enrichWithContactInfo(rep);
  }

  return rep;
}

/**
 * Clear contact info cache
 */
export function clearContactInfoCache() {
  contactInfoCache.clear();
  console.log('[RepresentativeService] Contact info cache cleared');
}

/**
 * Get cache stats
 */
export function getContactCacheStats() {
  return {
    size: contactInfoCache.size,
    mpIds: Array.from(contactInfoCache.keys()),
  };
}
