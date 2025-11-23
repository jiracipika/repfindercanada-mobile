/**
 * Direct Represent API Service - Client-side representative search
 * Uses Represent API directly for finding representatives by coordinates
 */

import type { Representative } from "@shared/schema";

const REPRESENT_API_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5001/api/represent/proxy'
  : 'https://represent.opennorth.ca';

/**
 * Search representatives by coordinates using Represent API directly
 */
export async function fetchRepsByCoordinatesDirect(
  latitude: number,
  longitude: number
): Promise<Representative[]> {
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

    const allRepresentatives: Representative[] = [];
    if (repsData.objects) {
      for (const rep of repsData.objects) {
        const representative = transformRepresentative(rep);
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
 * Transform Represent API representative object to our Representative interface
 */
function transformRepresentative(rep: any): Representative | null {
  try {
    if (!rep.name) {
      return null;
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

    // Extract party/affiliation
    let party = 'Independent';
    if (rep.party_name) {
      party = rep.party_name;
    } else if (rep.related?.party && rep.related.party.name) {
      party = rep.related.party.name;
    }

    // Extract riding/constituency name
    let riding = rep.district_name || rep.constituency_name || '';
    if (riding) {
      // Clean up riding name
      riding = riding
        .replace(/\s*\[.*?\]/g, '')
        .replace(/\s*—.*/g, '')
        .replace(/\s*- .*/g, '')
        .trim();
    }

    // Extract office title
    let office = rep.elected_office || rep.office || 'Representative';

    // Create representative object
    const representative: Representative = {
      id: rep.url || `${rep.name}-${rep.representative_set_name || ''}`,
      name: rep.name,
      level: level as 'federal' | 'provincial' | 'municipal',
      riding: riding,
      party: party,
      office: office,
      email: rep.email || '',
      phone: rep.phone || rep.voice || '',
      photoUrl: rep.photo_url || '',
      source: 'represent-api',
      extra: {
        url: rep.url || '',
        representativeSetName: rep.representative_set_name || '',
        firstName: rep.first_name || '',
        lastName: rep.last_name || ''
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
  representatives: Representative[];
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
export async function fetchRepsByNameDirect(name: string): Promise<Representative[]> {
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

    const representatives: Representative[] = [];
    if (data.objects) {
      for (const rep of data.objects) {
        const representative = transformRepresentative(rep);
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
export async function fetchRepsByRidingDirect(ridingName: string): Promise<Representative[]> {
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
    const allRepresentatives: Representative[] = [];

    for (const boundary of boundariesData.objects) {
      if (boundary.related && boundary.related.representatives_url) {
        try {
          const repsResponse = await fetch(boundary.related.representatives_url);
          if (repsResponse.ok) {
            const repsData = await repsResponse.json();
            if (repsData.objects) {
              for (const rep of repsData.objects) {
                const representative = transformRepresentative(rep);
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