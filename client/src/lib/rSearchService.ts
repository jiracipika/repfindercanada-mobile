/**
 * R-based search service - replaces existing representApi functionality
 * Uses the converted R logic for better Canadian postal code support
 */

import type { Representative } from "@shared/schema";
import { getRepsFromAddress, convertToExistingFormat, Representative as RRepresentative } from "./rGeocodeSearch";
import { normalizePostalCode } from "./nominatim";

/**
 * Enhanced postal code search using hybrid geocoding + Represent API approach
 * Uses region-specific geocoding services:
 * - Ontario: Alternative geocoding (Nominatim + fallbacks) for better accuracy
 * - Outside Ontario: geocoder.ca (original approach) for consistency
 * then searches representatives by coordinates using Represent API.
 */
export async function fetchRepsByPostalR(
  postal: string
): Promise<Representative[]> {
  const clean = normalizePostalCode(postal);

  console.log(`[fetchRepsByPostalR] Using hybrid geocoder + Represent API search for ${clean} (NO CACHE)`);

  // Use hybrid geocoding for coordinates, then Represent API for representatives - ALWAYS use API
  const preciseResults = await getRepsFromAddress(clean);
  console.log(`[fetchRepsByPostalR] Hybrid geocoder + Represent API search found ${preciseResults.length} representatives`);

  // Convert precise results to existing format for UI compatibility
  const representatives = convertToExistingFormat(preciseResults);

  return representatives;
}

/**
 * Enhanced location-based search using hybrid geocoding + Represent API approach
 * Direct coordinate search using Represent API with both coordinate orders for maximum reliability
 */
export async function fetchRepsByCoordinatesR(
  latitude: number,
  longitude: number
): Promise<Representative[]> {
  console.log(`[fetchRepsByCoordinatesR] Using coordinate search for [${latitude}, ${longitude}]`);

  // Convert coordinates to a search query - this will use the coordinate-based search path
  const query = `${latitude},${longitude}`;
  const rResults = await getRepsFromAddress(query);
  console.log(`[fetchRepsByCoordinatesR] Coordinate search found ${rResults.length} representatives`);

  // Convert R results to existing format for UI compatibility
  const representatives = convertToExistingFormat(rResults);

  return representatives;
}

/**
 * Get comprehensive search results with precise getRepsPrecise logic
 * Returns structured data similar to the original app format
 */
export async function getLocationDataR(
  query: string,
  searchType: "postal" | "address" | "coordinates" = "postal"
): Promise<{
  representatives: Representative[];
  debug: {
    query: string;
    searchType: string;
    preciseResults: RRepresentative[];
    coordinates?: { lat: number; lon: number; source: string };
  };
}> {
  const cleanQuery = normalizePostalCode(query);

  try {
    console.log(`[getLocationDataR] Starting precise search: ${cleanQuery} (${searchType}) (NO CACHE)`);

    // Use the precise search - ALWAYS use API
    const preciseResults = await getRepsFromAddress(cleanQuery);
    console.log(`[getLocationDataR] Precise search completed with ${preciseResults.length} results`);

    // Convert to existing format
    const representatives = convertToExistingFormat(preciseResults);

    // Extract coordinate info if available
    const coordinates = preciseResults.length > 0 ? {
      lat: preciseResults[0].latitude,
      lon: preciseResults[0].longitude,
      source: preciseResults[0].coord_source
    } : undefined;

    return {
      representatives,
      debug: {
        query: cleanQuery,
        searchType,
        preciseResults,
        coordinates
      }
    };
  } catch (error) {
    console.error(`[getLocationDataR] Error:`, error);
    throw error;
  }
}

/**
 * Validate Canadian phone numbers to prevent fake/incorrect numbers
 */
function isValidPhoneNumber(phone: string | undefined | null): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = phone.trim();

  // Basic validation for Canadian phone numbers
  // Accept formats: (613) 992-0919, 613-992-0919, 6139920919, 1 613 992-0919, etc.
  const phoneRegex = /^(\+?1[\s-]?)?(\(?[2-9]\d{2}\)?[\s-]?)?[2-9]\d{2}[\s-]?\d{4}$/;

  // Must be reasonable length (10-15 characters with formatting)
  if (cleaned.length < 10 || cleaned.length > 20) {
    return false;
  }

  // Check if it matches Canadian phone number pattern
  return phoneRegex.test(cleaned.replace(/[^\d\(\)\-\s\+]/g, ''));
}

/**
 * Enhanced search by name using R-based approach with Represent API
 * Uses the Represent API search endpoint with R-style filtering and processing
 */
export async function fetchRepsByNameR(name: string): Promise<Representative[]> {
  if (!name.trim()) {
    return [];
  }

  console.log(`[fetchRepsByNameR] Using R-enhanced Represent API search for "${name}"`);

  try {
    // --- R-style name search using Represent API ---
    const ua = {
      "User-Agent": "CanadianRepFinder/3.0.0 - R-enhanced name search",
      "Accept": "application/json",
    };

    // Search Represent API by name
    const searchUrl = `https://represent.opennorth.ca/representatives/?q=${encodeURIComponent(name.trim())}`;
    console.log(`[fetchRepsByNameR] Searching Represent API: ${searchUrl}`);

    const response = await fetch(searchUrl, { headers: ua });

    if (!response.ok) {
      throw new Error(`Represent API: HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[fetchRepsByNameR] Represent API returned ${data?.objects?.length || 0} results`);

    if (!data?.objects || !Array.isArray(data.objects)) {
      console.log(`[fetchRepsByNameR] No results found for "${name}"`);
      return [];
    }

    // Convert R-style representatives to existing format
    const representatives: Representative[] = [];

    for (const rep of data.objects) {
      // Extract phone number more carefully - prioritize legislature/constituency offices
      let phoneNumber: string | undefined;
      let faxNumber: string | undefined;

      if (rep.offices && Array.isArray(rep.offices) && rep.offices.length > 0) {
        // Find the best office for phone contact (prioritize legislature/constituency)
        const bestOffice = rep.offices.find(office =>
          office.type && (
            office.type.toLowerCase().includes('legislature') ||
            office.type.toLowerCase().includes('constituency') ||
            office.type.toLowerCase().includes('parliament')
          )
        ) || rep.offices[0]; // Fallback to first office

        // Debug logging for phone numbers
        if (bestOffice?.tel) {
          const isValid = isValidPhoneNumber(bestOffice.tel);
          console.log(`[fetchRepsByNameR] Phone validation for ${rep.name}: "${bestOffice.tel}" -> ${isValid ? 'VALID' : 'INVALID'}`);
          if (isValid) {
            phoneNumber = bestOffice.tel;
          }
        }

        if (bestOffice?.fax) {
          const isValid = isValidPhoneNumber(bestOffice.fax);
          console.log(`[fetchRepsByNameR] Fax validation for ${rep.name}: "${bestOffice.fax}" -> ${isValid ? 'VALID' : 'INVALID'}`);
          if (isValid) {
            faxNumber = bestOffice.fax;
          }
        }

        // If no valid phone found, log all available phone numbers for debugging
        if (!phoneNumber) {
          console.log(`[fetchRepsByNameR] No valid phone found for ${rep.name}. Available offices:`,
            rep.offices.map(office => ({
              type: office.type,
              tel: office.tel,
              isValid: office.tel ? isValidPhoneNumber(office.tel) : false
            }))
          );
        }
      }

      // Apply R-style filtering and enhancement
      const enhancedRep = {
        name: rep.name || "",
        electedOffice: rep.elected_office || "",
        constituency: rep.district_name || "",
        province: "", // Represent API doesn't provide province in name search
        party: rep.party_name || "Independent",
        email: rep.email || undefined,
        phone: phoneNumber, // Only include validated phone numbers
        photo: rep.photo_url || undefined,
        website: rep.url || rep.personal_url || undefined,
        personalWebsite: rep.personal_url || undefined,
        socialMedia: {},
        biography: null,
        offices: rep.offices || [],
        fax: faxNumber, // Only include validated fax numbers
        parliamentId: undefined,
        rep_set: rep.representative_set_name || "",
        createdAt: undefined,
        boundaryUrl: undefined,
        boundaryData: null,
        level: classifyRLevel(rep.elected_office, rep.representative_set_name),
      };

      // Generate ID using R-style logic
      const id = await generateRRepresentativeId(enhancedRep);

      representatives.push({
        id: id as any,
        ...enhancedRep,
      });
    }

    // Sort using R-style priority: Federal -> Provincial -> Municipal
    const sortedResults = representatives.sort((a, b) => {
      const getRPriority = (rep: Representative): number => {
        const office = (rep.electedOffice || "").toLowerCase();
        const level = (rep.level || "").toLowerCase();

        // Federal level (highest priority)
        if (office === 'mp' || level === 'federal') return 1;

        // Provincial level
        if (office === 'mpp' || office === 'mla' || office === 'mna' || level === 'provincial') return 2;

        // Municipal level
        if (office === 'mayor' || office === 'councillor' || office === 'councilor' || level === 'municipal') return 3;

        return 999; // Other/unknown
      };

      return getRPriority(a) - getRPriority(b);
    });

    // Apply R-style deduplication (remove exact duplicates)
    const deduplicatedResults = dedupeRRepresentatives(sortedResults);

    console.log(`[fetchRepsByNameR] R-enhanced search returning ${deduplicatedResults.length} representatives`);
    return deduplicatedResults;

  } catch (error) {
    console.error(`[fetchRepsByNameR] Error in R-enhanced search:`, error);
    return [];
  }
}

// Helper function to classify government level using R-style logic
function classifyRLevel(electedOffice: string, representativeSetName: string): string {
  const office = (electedOffice || "").toLowerCase();
  const setName = (representativeSetName || "").toLowerCase();

  // Federal level
  if (office === 'mp' || /house of commons|chambre des communes|parliament/i.test(setName)) {
    return "Federal";
  }

  // Provincial level
  if (/mpp|mla|mna/i.test(office) ||
      /legislative|national assembly|house of assembly|provincial/i.test(setName)) {
    return "Provincial/Territorial";
  }

  // Municipal level
  if (/mayor|councillor|councilor/i.test(office) ||
      /city|ville|council|conseil/i.test(setName)) {
    return "Municipal";
  }

  return "Other";
}

// Helper function to generate R-style representative ID
async function generateRRepresentativeId(rep: Partial<Representative>): Promise<string> {
  // Create a deterministic ID based on key fields
  const keyFields = [
    rep.name || "",
    rep.electedOffice || "",
    rep.constituency || "",
    rep.party || "",
    rep.level || ""
  ].join("|");

  // Simple hash function for consistent ID generation
  let hash = 0;
  for (let i = 0; i < keyFields.length; i++) {
    const char = keyFields.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `r_name_${Math.abs(hash)}_${Date.now()}`;
}

// Helper function to deduplicate representatives using R-style logic
function dedupeRRepresentatives(reps: Representative[]): Representative[] {
  const seen = new Set<string>();
  const deduped: Representative[] = [];

  for (const rep of reps) {
    // Create a unique key based on name + office + constituency
    const key = `${rep.name.toLowerCase()}|${rep.electedOffice?.toLowerCase()}|${rep.constituency?.toLowerCase()}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(rep);
    }
  }

  return deduped;
}

/**
 * Get federal representatives only (filtered from R results)
 */
export async function fetchFederalRepsR(
  query: string
): Promise<Representative[]> {
  const results = await fetchRepsByPostalR(query);
  return results.filter(rep => {
    // Check multiple ways to identify federal reps
    return (
      rep.electedOffice === "MP" ||
      rep.level === "Federal" ||
      rep.rep_set?.toLowerCase().includes("house of commons") ||
      rep.rep_set?.toLowerCase().includes("parliament")
    );
  });
}