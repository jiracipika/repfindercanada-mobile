import type { Representative } from "@shared/schema";
import { searchByName } from "./api/represent";
import { makeRepresentativeId, __debugCheckRepId } from "./repId";

interface OpenNorthRepresentative {
  name: string;
  district_name: string;
  province?: string;
  party_name?: string;
  email?: string;
  url?: string;
  photo_url?: string;
  personal_url?: string;
  offices?: Array<{
    postal?: string;
    tel?: string;
    fax?: string;
    type?: string;
  }>;
  elected_office: string;
  district_id?: number;
  extra?: Record<string, any>;
  related?: {
    boundary_url?: string;
  };
}

interface BoundaryInfo {
  extent?: number[]; // [minLng, minLat, maxLng, maxLat]
}

/**
 * Fetch boundary information from OpenNorth API
 */
async function fetchBoundaryInfo(boundaryUrl: string): Promise<BoundaryInfo> {
  try {
    const response = await fetch(`https://represent.opennorth.ca${boundaryUrl}?format=json`);
    if (!response.ok) return {};

    const data = await response.json();
    return {
      extent: data.extent, // [minLng, minLat, maxLng, maxLat]
    };
  } catch (error) {
    console.error('Failed to fetch boundary info:', error);
    return {};
  }
}

/**
 * Convert raw result from Represent API to our internal Representative shape.
 */
async function toRepresentative(raw: OpenNorthRepresentative): Promise<Representative> {
  const id = await makeRepresentativeId({
    source: "opennorth-postal",
    elected_office: raw.elected_office,
    name: raw.name,
    district_name: raw.district_name,
    ocd_id: raw.district_id ? String(raw.district_id) : undefined,
    party_name: raw.party_name,
    email: raw.email,
  });

  // Fetch boundary information if available
  let boundaryInfo: BoundaryInfo = {};
  if (raw.related?.boundary_url) {
    boundaryInfo = await fetchBoundaryInfo(raw.related.boundary_url);
  }

  const rep: Representative = {
    id: id as any, // Cast to any as schema expects number, but we use string for mobile-only build
    name: raw.name,
    party: raw.party_name ?? "Independent",
    constituency: raw.district_name,
    province: raw.province ?? "",
    electedOffice: raw.elected_office ?? undefined,
    email: raw.email ?? undefined,
    phone: raw.offices?.[0]?.tel ?? undefined,
    photo: raw.photo_url ?? undefined,
    website: raw.url ?? undefined,
    personalWebsite: raw.personal_url ?? undefined,
    socialMedia: raw.extra ?? {},
    biography: null,
    offices: raw.offices ?? [],
    fax: raw.offices?.[0]?.fax ?? undefined,
    parliamentId: raw.district_id ? String(raw.district_id) : undefined,
    boundaryUrl: raw.related?.boundary_url ?? undefined,
    boundaryExtent: boundaryInfo.extent ?? undefined,
    createdAt: undefined,
  } as unknown as Representative;

  __debugCheckRepId(rep.id as string);
  return rep;
}

/**
 * Sort representatives by government level: MP first, MPP second, municipal third
 */
function sortRepresentatives(reps: Representative[]): Representative[] {
  return reps.sort((a, b) => {
    const getLevel = (office?: string | null): number => {
      if (!office) return 3;
      const officeStr = office.toLowerCase();
      if (officeStr === 'mp') return 0; // Federal first
      if (officeStr === 'mpp' || officeStr === 'mla' || officeStr === 'mna') return 1; // Provincial second
      return 2; // Municipal third
    };

    return getLevel(a.electedOffice) - getLevel(b.electedOffice);
  });
}

export async function fetchRepsByPostal(postal: string): Promise<Representative[]> {
  const clean = postal.replace(/\s+/g, "").toUpperCase();
  const res = await fetch(`https://represent.opennorth.ca/postcodes/${clean}/`);
  if (!res.ok) {
    throw new Error(`Represent API error ${res.status}`);
  }
  const data = await res.json();
  // Include all levels of government: Federal (MP), Provincial (MPP/MLA/MNA), and Municipal
  const reps: OpenNorthRepresentative[] = (data.representatives_centroid || data.representatives_concordance || []);
  const representatives = await Promise.all(reps.map(toRepresentative));
  return sortRepresentatives(representatives);
}

export { searchByName as fetchRepsByName }; 