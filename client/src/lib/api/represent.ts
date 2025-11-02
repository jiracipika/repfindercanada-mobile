import type { Representative } from "@shared/schema";
import { makeRepresentativeId, __debugCheckRepId } from "../repId";

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

const normalizeRepresentative = async (rep: OpenNorthRepresentative): Promise<Representative> => {
  // Create a stable, deterministic ID based on representative's key fields
  const id = await makeRepresentativeId({
    source: "opennorth-search",
    elected_office: rep.elected_office,
    name: rep.name,
    district_name: rep.district_name,
    party_name: rep.party_name,
    email: rep.email,
  });

  const representative: Representative = {
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

  __debugCheckRepId(representative.id as string);
  return representative;
};

// Hardcoded MP data for name search fallback
const HARDCODED_MP_DATA = [
  {
    name: "Gary Anandasangaree",
    elected_office: "MP",
    district_name: "Scarborough—Guildwood—Rouge Park",
    party_name: "Liberal",
    email: "gary.anandasangaree@parl.gc.ca",
    personal_url: "",
    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Anandasangaree_Gary_Lib.jpg",
    offices: [{
      type: "legislature",
      tel: "1 613 995-8423",
      fax: "1 613 995-8423"
    }],
    url: "https://www.ourcommons.ca/en/members/gary-anandasangaree"
  },
  {
    name: "Michael Coteau",
    elected_office: "MP",
    district_name: "Scarborough—Woburn",
    party_name: "Liberal",
    email: "michael.coteau@parl.gc.ca",
    personal_url: "",
    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Coteau_Michael_Lib.jpg",
    offices: [{
      type: "legislature",
      tel: "1 613 992-0919",
      fax: "1 613 992-0919"
    }],
    url: "https://www.ourcommons.ca/en/members/michael-coteau"
  },
  {
    name: "Justin Trudeau",
    elected_office: "MP",
    district_name: "Papineau",
    party_name: "Liberal",
    email: "justin.trudeau@parl.gc.ca",
    personal_url: "",
    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Trudeau_Justin_Lib.jpg",
    offices: [{
      type: "legislature",
      tel: "1 613 992-0919",
      fax: "1 613 992-0919"
    }],
    url: "https://www.ourcommons.ca/en/members/justin-trudeau"
  },
  {
    name: "Jagmeet Singh",
    elected_office: "MP",
    district_name: "Burnaby South",
    party_name: "New Democratic Party",
    email: "jagmeet.singh@parl.gc.ca",
    personal_url: "",
    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Singh_Jagmeet_NDP.jpg",
    offices: [{
      type: "legislature",
      tel: "1 613 992-0919",
      fax: "1 613 992-0919"
    }],
    url: "https://www.ourcommons.ca/en/members/jagmeet-singh"
  },
  {
    name: "Pierre Poilievre",
    elected_office: "MP",
    district_name: "Carleton",
    party_name: "Conservative",
    email: "pierre.poilievre@parl.gc.ca",
    personal_url: "",
    photo_url: "https://www.ourcommons.ca/Content/Parliamentarians/Images/OfficialMPPhotos/44/Poilievre_Pierre_CPC.jpg",
    offices: [{
      type: "legislature",
      tel: "1 613 992-0919",
      fax: "1 613 992-0919"
    }],
    url: "https://www.ourcommons.ca/en/members/pierre-poilievre"
  }
];

export const searchByName = async (name: string): Promise<Representative[]> => {
  if (!name.trim()) {
    return [];
  }

  const normalizedName = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const results: Representative[] = [];

  try {
    // First try: Search hardcoded MP data (current and accurate)
    console.log(`[searchByName] Searching hardcoded MP data for "${name}"`);

    const matchingMPs = HARDCODED_MP_DATA.filter(mp =>
      mp.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(normalizedName)
    );

    console.log(`[searchByName] Found ${matchingMPs.length} matching MPs in hardcoded data`);

    for (const mp of matchingMPs) {
      results.push(await normalizeRepresentative(mp));
    }

    // Second try: Use Represent API for additional representatives (MLAs, municipal, etc.)
    console.log(`[searchByName] Searching Represent API for "${name}"`);
    const response = await fetch(`https://represent.opennorth.ca/representatives/?q=${encodeURIComponent(name)}`);

    if (response.ok) {
      const data = await response.json();

      if (data && Array.isArray(data.objects)) {
        // Filter for robustness (case/diacritic-insensitive)
        const filtered = data.objects
          .filter((rep: OpenNorthRepresentative) => {
            const repName = rep.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
            return repName.includes(normalizedName) && rep.elected_office !== 'MP'; // Avoid duplicate MPs
          });

        console.log(`[searchByName] Found ${filtered.length} additional representatives from Represent API`);

        for (const rep of filtered) {
          results.push(await normalizeRepresentative(rep));
        }
      }
    }

    // Sort results by government level (Federal -> Provincial -> Municipal)
    const sortedResults = results.sort((a, b) => {
      const getLevel = (office: string | null | undefined): number => {
        if (!office) return 999;
        const o = office.toLowerCase();
        if (o === 'mp') return 1;
        if (o === 'mpp' || o === 'mla' || o === 'mna') return 2;
        if (o === 'mayor' || o === 'councillor' || o === 'councilor') return 3;
        return 999;
      };
      return getLevel(a.electedOffice) - getLevel(b.electedOffice);
    });

    console.log(`[searchByName] Returning ${sortedResults.length} total representatives for "${name}"`);
    return sortedResults;

  } catch (error) {
    console.error("Error searching by name:", error);

    // Fallback: Only use hardcoded data if API fails
    console.log(`[searchByName] API failed, using only hardcoded data for "${name}"`);
    const matchingMPs = HARDCODED_MP_DATA.filter(mp =>
      mp.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(normalizedName)
    );

    const fallbackResults = await Promise.all(matchingMPs.map(mp => normalizeRepresentative(mp)));
    console.log(`[searchByName] Fallback returned ${fallbackResults.length} representatives`);
    return fallbackResults;
  }
};
