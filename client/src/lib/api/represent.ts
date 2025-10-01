import type { Representative } from "@shared/schema";

interface OpenNorthRepresentative {
  name: string;
  elected_office: string;
  district_name: string;
  party_name: string;
  email: string;
  personal_url: string;
  photo_url: string;
  offices: { type: string; tel: string; fax?: string }[];
  url?: string; // Sometimes available
}

const normalizeRepresentative = (rep: OpenNorthRepresentative, index: number): Representative => {
  // Create a stable ID. If OpenNorth provides a unique ID, use it. Otherwise, generate one.
  // For this endpoint, a unique ID is not directly available, so we generate one.
  const id = `open-north-${btoa(encodeURIComponent(`${rep.name}-${rep.district_name}-${rep.elected_office}-${index}`))}`;

  return {
    id: id as any, // Cast to any because the schema expects number, but we're generating string for now
    name: rep.name,
    party: rep.party_name || "Independent",
    constituency: rep.district_name,
    province: "", // Not provided by this OpenNorth endpoint
    email: rep.email || undefined,
    phone: rep.offices?.[0]?.tel || undefined,
    photo: rep.photo_url || undefined,
    website: rep.url || rep.personal_url || undefined,
    personalWebsite: rep.personal_url || undefined,
    socialMedia: {}, // Not provided by this OpenNorth endpoint
    biography: null,
    offices: rep.offices || [],
    fax: rep.offices?.[0]?.fax || undefined,
    parliamentId: undefined, // Not provided by this OpenNorth endpoint
    createdAt: undefined,
  };
};

export const searchByName = async (name: string): Promise<Representative[]> => {
  if (!name.trim()) {
    return [];
  }

  try {
    const response = await fetch(`https://represent.opennorth.ca/representatives/?q=${encodeURIComponent(name)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // OpenNorth API returns a 'objects' array
    if (data && Array.isArray(data.objects)) {
      // Client-side filtering for robustness (case/diacritic-insensitive)
      const normalizedName = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      return data.objects
        .filter((rep: OpenNorthRepresentative) => 
          rep.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(normalizedName)
        )
        .map((rep: OpenNorthRepresentative, index: number) => normalizeRepresentative(rep, index));
    }
    return [];
  } catch (error) {
    console.error("Error searching by name:", error);
    // In a real app, you might want to throw a more specific error or return a Result type
    return [];
  }
};
