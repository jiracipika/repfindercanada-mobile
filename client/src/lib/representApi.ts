import type { Representative } from "@shared/schema";
import { searchByName } from "./api/represent";

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
}

/**
 * Convert raw result from Represent API to our internal Representative shape.
 */
function toRepresentative(raw: OpenNorthRepresentative, idx: number = 0): Representative {
  return {
    // The mobile-only build doesn't use DB ids – just generate a stable pseudo-id.
    id: (raw.district_id ?? `postal-search-${idx}`) as any, // Cast to any as schema expects number, but we might get string
    name: raw.name,
    party: raw.party_name ?? "Independent",
    constituency: raw.district_name,
    province: raw.province ?? "",
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
    createdAt: undefined,
  } as unknown as Representative;
}

export async function fetchRepsByPostal(postal: string): Promise<Representative[]> {
  const clean = postal.replace(/\s+/g, "").toUpperCase();
  const res = await fetch(`https://represent.opennorth.ca/postcodes/${clean}/`);
  if (!res.ok) {
    throw new Error(`Represent API error ${res.status}`);
  }
  const data = await res.json();
  const reps: OpenNorthRepresentative[] = (data.representatives_centroid || data.representatives_concordance || [])
    .filter((r: any) => r.elected_office === "MP");
  return reps.map(toRepresentative);
}

export { searchByName as fetchRepsByName }; 