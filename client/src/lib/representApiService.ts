/**
 * Direct Represent API Service - Client-side representative search
 * Uses Represent API directly for finding representatives by coordinates
 */

import type { ApiRepresentative } from "@shared/schema";

const REPRESENT_API_BASE = import.meta.env.DEV
  ? 'http://localhost:5001/api/represent/proxy'
  : 'https://represent.opennorth.ca';

/**
 * Search representatives by coordinates using Represent API directly
 */
export async function fetchRepsByCoordinatesDirect(
  latitude: number,
  longitude: number
): Promise<ApiRepresentative[]> {
  try {
    console.log(`[RepresentAPI] Searching for representatives at coordinates: ${latitude}, ${longitude}`);

    // Direct representatives search by point (newer Represent API approach)
    const repsResponse = await fetch(
      `${REPRESENT_API_BASE}/representatives/?point=${latitude},${longitude}&limit=50`
    );

    if (!repsResponse.ok) {
      throw new Error(`Representatives API error: ${repsResponse.status}`);
    }

    const repsData = await repsResponse.json();
    console.log(`[RepresentAPI] Found ${repsData.objects?.length || 0} representatives directly`);

    const allRepresentatives: ApiRepresentative[] = [];
    if (repsData.objects) {
      for (const rep of repsData.objects) {
        const representative = await transformRepresentative(rep);
        if (representative) {
          allRepresentatives.push(representative);
        }
      }
    }

    // Remove duplicates (same person might represent multiple areas)
    const uniqueRepresentatives = allRepresentatives.filter((rep, index, arr) =>
      arr.findIndex(r => r.name === rep.name && r.level === rep.level) === index
    );

    // Sort by government level: Federal → Provincial → Municipal
    const sortedRepresentatives = uniqueRepresentatives.sort((a, b) => {
      const levelOrder = { 'federal': 1, 'provincial': 2, 'municipal': 3 };
      return (levelOrder[a.level as keyof typeof levelOrder] || 99) -
             (levelOrder[b.level as keyof typeof levelOrder] || 99);
    });

    console.log(`[RepresentAPI] Returning ${sortedRepresentatives.length} unique representatives`);
    return sortedRepresentatives;

  } catch (error) {
    console.error('[RepresentAPI] Error searching by coordinates:', error);
    throw error;
  }
}

/**
 * Fetch detailed representative information from Represent API
 */
async function fetchRepresentativeDetails(repUrl: string): Promise<any | null> {
  try {
    const response = await fetch(`${REPRESENT_API_BASE}${repUrl}`);
    if (!response.ok) {
      console.warn(`[RepresentAPI] Failed to fetch details for ${repUrl}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`[RepresentAPI] Error fetching details for ${repUrl}:`, error);
    return null;
  }
}

/**
 * Transform Represent API representative object to our Representative interface
 */
async function transformRepresentative(rep: any): Promise<ApiRepresentative | null> {
  try {
    if (!rep.name) {
      return null;
    }

    // Fetch detailed information if URL is available
    let details = null;
    if (rep.url && rep.url !== rep.self) {
      details = await fetchRepresentativeDetails(rep.url);
    }

    // Determine government level based on representative set name
    let level = 'other';
    if (rep.representative_set_name?.toLowerCase().includes('house of commons') ||
        rep.representative_set_name?.toLowerCase().includes('federal')) {
      level = 'federal';
    } else if (rep.representative_set_name?.toLowerCase().includes('provincial') ||
               rep.representative_set_name?.toLowerCase().includes('legislature') ||
               rep.representative_set_name?.toLowerCase().includes('national assembly')) {
      level = 'provincial';
    } else if (rep.representative_set_name?.toLowerCase().includes('city') ||
               rep.representative_set_name?.toLowerCase().includes('municipal') ||
               rep.representative_set_name?.toLowerCase().includes('council')) {
      level = 'municipal';
    }

    // Extract party/affiliation - prefer detailed info
    let party = 'Independent';
    if (details?.party_name) {
      party = details.party_name;
    } else if (rep.party_name) {
      party = rep.party_name;
    } else if (details?.related?.party?.name) {
      party = details.related.party.name;
    } else if (rep.related?.party && rep.related.party.name) {
      party = rep.related.party.name;
    }

    // Extract riding/constituency name - prefer detailed info
    let riding = details?.district_name || rep.district_name || rep.constituency_name || '';
    if (riding) {
      // Clean up riding name (preserve full riding names with em dashes)
      riding = riding
        .replace(/\s*\[.*?\]/g, '')
        .replace(/\s*\-\s.*$/g, '') // Only remove text after regular dash, not em dash
        .trim();
    }

    // Extract office title - prefer detailed info
    let office = details?.elected_office || rep.elected_office || details?.office || rep.office || 'Representative';

    // Extract contact information - prefer detailed info
    const email = details?.email || rep.email || '';

    // Extract phone number from multiple sources
    let phone = '';

    // 1. Try detailed info first
    if (details?.phone || details?.voice) {
      phone = details.phone || details.voice;
    }
    // 2. Try basic rep fields
    else if (rep.phone || rep.voice) {
      phone = rep.phone || rep.voice;
    }
    // 3. Try offices array (most reliable source) - prioritize constituency office for local contact
    else if (rep.offices && rep.offices.length > 0) {
      // Prefer constituency office for local contact, then legislature office, then any available
      const constituencyOffice = rep.offices.find((office: any) =>
        office.type?.toLowerCase().includes('constituency')
      );
      const legislatureOffice = rep.offices.find((office: any) =>
        office.type?.toLowerCase().includes('legislature')
      );

      // Use constituency office first (most relevant for users), then legislature, then any office with phone
      const officeWithPhone = constituencyOffice || legislatureOffice || rep.offices.find((office: any) => office.tel);

      if (officeWithPhone?.tel) {
        phone = officeWithPhone.tel;
        console.log(`[RepresentAPI] Phone extracted for ${rep.name}: ${phone} (from ${officeWithPhone.type} office)`);
      } else {
        console.log(`[RepresentAPI] No phone found for ${rep.name} in offices:`, rep.offices);
      }
    }
    // 4. Try detailed offices - same prioritization logic
    else if (details?.offices && details.offices.length > 0) {
      const constituencyOffice = details.offices.find((office: any) =>
        office.type?.toLowerCase().includes('constituency')
      );
      const legislatureOffice = details.offices.find((office: any) =>
        office.type?.toLowerCase().includes('legislature')
      );

      const officeWithPhone = constituencyOffice || legislatureOffice || details.offices.find((office: any) => office.tel);

      if (officeWithPhone?.tel) {
        phone = officeWithPhone.tel;
      }
    }

    const photo = details?.photo_url || rep.photo_url || '';

    // Extract websites and social media
    let website = details?.url || rep.url || '';
    let personalWebsite = '';
    let socialMedia: any = {};

    // Extract additional contact info from details
    if (details) {
      // Websites
      if (details.personal_url || details.website) {
        personalWebsite = details.personal_url || details.website;
      }

      // Social media
      if (details.social_media) {
        socialMedia = details.social_media;
      }

      // Office information
      const offices: any[] = [];
      if (details.offices) {
        offices.push(...details.offices);
      } else if (details.email || details.phone) {
        // Create basic office info if no structured offices data
        offices.push({
          type: 'primary',
          postal: '',
            phone: details.phone || phone,
            fax: details.fax || '',
            email: details.email || email
        });
      }
    }

    // Extract office information for the offices field
    let offices: any[] = [];

    // Add offices from detailed info first
    if (details?.offices && details.offices.length > 0) {
      offices.push(...details.offices);
    }
    // Then add offices from basic rep data
    else if (rep.offices && rep.offices.length > 0) {
      offices.push(...rep.offices);
    }
    // Create basic office if no structured data but we have contact info
    else if (phone || email) {
      offices.push({
        type: office?.toLowerCase().includes('mayor') ? 'City Hall' :
              office?.toLowerCase().includes('mp') ? 'Constituency Office' :
              office?.toLowerCase().includes('mpp') || office?.toLowerCase().includes('mna') ? 'Constituency Office' :
              'Main Office',
        tel: phone,
        email: email,
        postal: riding || ''
      });
    }

    // Create representative object with all available fields
    const representative: ApiRepresentative = {
      id: rep.url || `${rep.name}-${rep.representative_set_name || ''}`,
      name: rep.name,
      party: party,
      constituency: riding,
      province: '', // This might need to be extracted from district_name or other field
      electedOffice: office,
      email: email,
      phone: phone,
      photo: photo,
      website: website,
      personalWebsite: personalWebsite,
      socialMedia: socialMedia,
      biography: details?.biography || '',
      offices: offices,
      fax: details?.fax || rep.fax || '',
      parliamentId: details?.parliament_id || '',
      boundaryUrl: details?.boundary_url || rep.boundary_url || '',
      boundaryData: details?.boundary_data || rep.boundary_data || null,
      // Add extra fields for compatibility
      level: level as 'federal' | 'provincial' | 'municipal',
      riding: riding,
      office: office,
      source: 'represent-api',
      extra: {
        url: rep.url || '',
        representativeSetName: rep.representative_set_name || '',
        firstName: rep.first_name || details?.first_name || '',
        lastName: rep.last_name || details?.last_name || '',
        hasDetails: !!details
      }
    };

    return representative;
  } catch (error) {
    console.error('[RepresentAPI] Error transforming representative:', error);
    return null;
  }
}

/**

/**
 * Search representatives by postal code using local coordinates + Represent API
 */
export async function fetchRepsByPostalCodeDirect(postalCode: string): Promise<{
  representatives: ApiRepresentative[];
  geocoding: {
    postalCode: string;
    latitude: number;
    longitude: number;
    source: string;
  };
}> {
  const { getCoordinatesFromPostalCodeLocal } = await import('./localPostalLookup');

  // Get coordinates from local data
  const coordinates = await getCoordinatesFromPostalCodeLocal(postalCode);
  if (!coordinates) {
    throw new Error(`Postal code not found: ${postalCode}`);
  }

  // Search representatives using coordinates
  const representatives = await fetchRepsByCoordinatesDirect(coordinates.latitude, coordinates.longitude);

  return {
    representatives,
    geocoding: {
      postalCode: postalCode,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: 'local-database'
    }
  };
}

/**
 * Search representatives by name using Represent API directly
 */
export async function fetchRepsByNameDirect(name: string): Promise<ApiRepresentative[]> {
  try {
    console.log(`[RepresentAPI] Searching for representatives by name: ${name}`);

    const response = await fetch(
      `${REPRESENT_API_BASE}/representatives/?name=${encodeURIComponent(name)}&limit=50`
    );

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[RepresentAPI] Found ${data.objects?.length || 0} representatives`);

    const representatives: ApiRepresentative[] = [];
    if (data.objects) {
      for (const rep of data.objects) {
        const representative = await transformRepresentative(rep);
        if (representative) {
          representatives.push(representative);
        }
      }
    }

    // Sort by government level: Federal → Provincial → Municipal
    const sortedRepresentatives = representatives.sort((a, b) => {
      const levelOrder = { 'federal': 1, 'provincial': 2, 'municipal': 3 };
      return (levelOrder[a.level as keyof typeof levelOrder] || 99) -
             (levelOrder[b.level as keyof typeof levelOrder] || 99);
    });

    return sortedRepresentatives;

  } catch (error) {
    console.error('[RepresentAPI] Error searching by name:', error);
    throw error;
  }
}

/**
 * Search representatives by riding/constituency name using Represent API directly
 */
export async function fetchRepsByRidingDirect(ridingName: string): Promise<ApiRepresentative[]> {
  try {
    console.log(`[RepresentAPI] Searching for representatives by riding: ${ridingName}`);

    // Search for boundaries by name
    const boundariesResponse = await fetch(
      `${REPRESENT_API_BASE}/boundaries/?name=${encodeURIComponent(ridingName)}&limit=20`
    );

    if (!boundariesResponse.ok) {
      throw new Error(`Boundaries API error: ${boundariesResponse.status}`);
    }

    const boundariesData = await boundariesResponse.json();
    console.log(`[RepresentAPI] Found ${boundariesData.objects?.length || 0} matching boundaries`);

    if (!boundariesData.objects || boundariesData.objects.length === 0) {
      return [];
    }

    // Get representatives for each boundary
    const allRepresentatives: ApiRepresentative[] = [];

    for (const boundary of boundariesData.objects) {
      if (boundary.related && boundary.related.representatives_url) {
        try {
          const repsResponse = await fetch(boundary.related.representatives_url);
          if (repsResponse.ok) {
            const repsData = await repsResponse.json();
            if (repsData.objects) {
              for (const rep of repsData.objects) {
                const representative = await transformRepresentative(rep);
                if (representative) {
                  allRepresentatives.push(representative);
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[RepresentAPI] Error fetching representatives for boundary:`, error);
        }
      }
    }

    // Sort by government level: Federal → Provincial → Municipal
    const sortedRepresentatives = allRepresentatives.sort((a, b) => {
      const levelOrder = { 'federal': 1, 'provincial': 2, 'municipal': 3 };
      return (levelOrder[a.level as keyof typeof levelOrder] || 99) -
             (levelOrder[b.level as keyof typeof levelOrder] || 99);
    });

    return sortedRepresentatives;

  } catch (error) {
    console.error('[RepresentAPI] Error searching by riding:', error);
    throw error;
  }
}