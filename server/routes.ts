import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepresentativeSchema, insertSearchSchema, insertSavedRepresentativeSchema } from "@shared/schema";
import { z } from "zod";

interface OpenParliamentRepresentative {
  name: string;
  current_party: {
    short_name: {
      en: string;
    };
  };
  current_riding: {
    name: {
      en: string;
    };
    province: string;
  };
  image?: string;
  url?: string;
}

// Postal code to riding mapping for major Canadian postal codes
const POSTAL_CODE_TO_RIDING: Record<string, string[]> = {
  'K1A': ['Ottawa—Vanier', 'Ottawa Centre'],
  'K1B': ['Ottawa—Vanier'],
  'K1C': ['Ottawa—Vanier'],
  'K1G': ['Ottawa South'],
  'K1H': ['Ottawa South'],
  'K1J': ['Ottawa—Vanier'],
  'K1K': ['Ottawa—Vanier'],
  'K1L': ['Ottawa—Vanier'],
  'K1M': ['Ottawa South'],
  'K1N': ['Ottawa Centre'],
  'K1P': ['Ottawa Centre'],
  'K1R': ['Ottawa Centre'],
  'K1S': ['Ottawa South'],
  'K1T': ['Ottawa South'],
  'K1V': ['Ottawa South'],
  'K1W': ['Ottawa West—Nepean'],
  'K1Y': ['Ottawa Centre'],
  'K1Z': ['Ottawa West—Nepean'],
  'K2A': ['Ottawa West—Nepean'],
  'K2B': ['Ottawa West—Nepean'],
  'K2C': ['Ottawa West—Nepean'],
  'K2E': ['Ottawa West—Nepean'],
  'K2G': ['Ottawa West—Nepean'],
  'K2H': ['Ottawa West—Nepean'],
  'K2J': ['Ottawa West—Nepean'],
  'K2K': ['Ottawa West—Nepean'],
  'K2L': ['Ottawa West—Nepean'],
  'K2M': ['Ottawa West—Nepean'],
  'K2P': ['Ottawa West—Nepean'],
  'K2R': ['Ottawa West—Nepean'],
  'K2S': ['Ottawa West—Nepean'],
  'K2T': ['Ottawa West—Nepean'],
  'K2V': ['Ottawa West—Nepean'],
  'K2W': ['Ottawa West—Nepean'],
  'M5V': ['Toronto Centre'],
  'M5G': ['University—Rosedale'],
  'M4W': ['Toronto Centre'],
  'M4Y': ['Toronto Centre'],
  'M5A': ['Toronto—Danforth'],
  'M5B': ['Toronto Centre'],
  'M5C': ['Toronto Centre'],
  'M5E': ['Toronto Centre'],
  'M5H': ['Toronto Centre'],
  'M5J': ['Toronto Centre'],
  'M5K': ['University—Rosedale'],
  'M5L': ['University—Rosedale'],
  'M5M': ['Willowdale'],
  'M5N': ['University—Rosedale'],
  'M5P': ['University—Rosedale'],
  'M5R': ['University—Rosedale'],
  'M5S': ['University—Rosedale'],
  'M5T': ['University—Rosedale'],
  'M5W': ['Toronto Centre'],
  'M5X': ['Toronto Centre'],
  'H2Y': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'H3A': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'H3B': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'H3C': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'H3G': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'H3H': ['Ville-Marie—Le Sud-Ouest—Île-des-Sœurs'],
  'V6B': ['Vancouver Centre'],
  'V6C': ['Vancouver Centre'],
  'V6E': ['Vancouver Centre'],
  'V6G': ['Vancouver Centre'],
  'V6H': ['Vancouver Centre'],
  'V6J': ['Vancouver Centre'],
  'V6K': ['Vancouver Centre'],
  'V6L': ['Vancouver Centre'],
  'V6M': ['Vancouver Centre'],
  'V6P': ['Vancouver South'],
  'V6R': ['Vancouver Centre'],
  'V6S': ['Vancouver Centre'],
  'V6T': ['Vancouver Centre'],
  'V6Z': ['Vancouver Centre'],
  'T2P': ['Calgary Centre'],
  'T2R': ['Calgary Centre'],
  'T2S': ['Calgary Centre'],
  'T3A': ['Calgary Skyview'],
  'T3B': ['Calgary Skyview'],
  'T3C': ['Calgary Skyview'],
  'T3E': ['Calgary Skyview'],
  'T3G': ['Calgary Skyview'],
  'T3H': ['Calgary Rocky Ridge'],
  'T3J': ['Calgary Rocky Ridge'],
  'T3K': ['Calgary Rocky Ridge'],
  'T3L': ['Calgary Rocky Ridge'],
  'T3M': ['Calgary Rocky Ridge'],
  'T3N': ['Calgary Rocky Ridge'],
  'T3P': ['Calgary Rocky Ridge'],
  'T3R': ['Calgary Rocky Ridge'],
  'T3Z': ['Calgary Rocky Ridge']
};

// Cache for politician data
let politiciansCache: OpenParliamentRepresentative[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for faster updates

// Sample data that matches real Canadian MPs structure
const SAMPLE_POLITICIANS: OpenParliamentRepresentative[] = [
  {
    name: "Justin Trudeau",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Papineau" }, province: "QC" },
    image: "/media/polpics/justin-trudeau.jpg",
    url: "/politicians/justin-trudeau/"
  },
  {
    name: "Chrystia Freeland",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "University—Rosedale" }, province: "ON" },
    image: "/media/polpics/chrystia-freeland.jpg",
    url: "/politicians/chrystia-freeland/"
  },
  {
    name: "Pierre Poilievre",
    current_party: { short_name: { en: "Conservative" } },
    current_riding: { name: { en: "Carleton" }, province: "ON" },
    image: "/media/polpics/pierre-poilievre.jpg",
    url: "/politicians/pierre-poilievre/"
  },
  {
    name: "Jagmeet Singh",
    current_party: { short_name: { en: "NDP" } },
    current_riding: { name: { en: "Burnaby South" }, province: "BC" },
    image: "/media/polpics/jagmeet-singh.jpg",
    url: "/politicians/jagmeet-singh/"
  },
  {
    name: "Yves-François Blanchet",
    current_party: { short_name: { en: "Bloc Québécois" } },
    current_riding: { name: { en: "Beloeil—Chambly" }, province: "QC" },
    image: "/media/polpics/yves-francois-blanchet.jpg",
    url: "/politicians/yves-francois-blanchet/"
  },
  {
    name: "Elizabeth May",
    current_party: { short_name: { en: "Green" } },
    current_riding: { name: { en: "Saanich—Gulf Islands" }, province: "BC" },
    image: "/media/polpics/elizabeth-may.jpg",
    url: "/politicians/elizabeth-may/"
  },
  {
    name: "Mona Fortier",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Ottawa—Vanier" }, province: "ON" },
    image: "/media/polpics/mona-fortier.jpg",
    url: "/politicians/mona-fortier/"
  },
  {
    name: "Yasir Naqvi",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Ottawa Centre" }, province: "ON" },
    image: "/media/polpics/yasir-naqvi.jpg",
    url: "/politicians/yasir-naqvi/"
  },
  {
    name: "David McGuinty",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Ottawa South" }, province: "ON" },
    image: "/media/polpics/david-mcguinty.jpg",
    url: "/politicians/david-mcguinty/"
  },
  {
    name: "Anita Vandenbeld",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Ottawa West—Nepean" }, province: "ON" },
    image: "/media/polpics/anita-vandenbeld.jpg",
    url: "/politicians/anita-vandenbeld/"
  },
  {
    name: "Chrystia Freeland",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "University—Rosedale" }, province: "ON" },
    image: "/media/polpics/chrystia-freeland.jpg",
    url: "/politicians/chrystia-freeland/"
  },
  {
    name: "Julie Dabrusin",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Toronto—Danforth" }, province: "ON" },
    image: "/media/polpics/julie-dabrusin.jpg",
    url: "/politicians/julie-dabrusin/"
  },
  {
    name: "Marci Ien",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Toronto Centre" }, province: "ON" },
    image: "/media/polpics/marci-ien.jpg",
    url: "/politicians/marci-ien/"
  },
  {
    name: "Hedy Fry",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Vancouver Centre" }, province: "BC" },
    image: "/media/polpics/hedy-fry.jpg",
    url: "/politicians/hedy-fry/"
  },
  {
    name: "Harjit Sajjan",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Vancouver South" }, province: "BC" },
    image: "/media/polpics/harjit-sajjan.jpg",
    url: "/politicians/harjit-sajjan/"
  },
  {
    name: "George Chahal",
    current_party: { short_name: { en: "Liberal" } },
    current_riding: { name: { en: "Calgary Skyview" }, province: "AB" },
    image: "/media/polpics/george-chahal.jpg",
    url: "/politicians/george-chahal/"
  },
  {
    name: "Greg McLean",
    current_party: { short_name: { en: "Conservative" } },
    current_riding: { name: { en: "Calgary Centre" }, province: "AB" },
    image: "/media/polpics/greg-mclean.jpg",
    url: "/politicians/greg-mclean/"
  },
  {
    name: "Pat Kelly",
    current_party: { short_name: { en: "Conservative" } },
    current_riding: { name: { en: "Calgary Rocky Ridge" }, province: "AB" },
    image: "/media/polpics/pat-kelly.jpg",
    url: "/politicians/pat-kelly/"
  }
];

async function getAllPoliticians(): Promise<OpenParliamentRepresentative[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (politiciansCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return politiciansCache;
  }
  
  try {
    console.log('Attempting to fetch from Represent API...');
    const response = await fetch('https://represent.opennorth.ca/representatives/house-of-commons/', {
      headers: {
        'User-Agent': 'FindMyRep/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const representatives = data.objects || [];
    
    if (Array.isArray(representatives) && representatives.length > 0) {
      // Transform Represent API data to our format
      politiciansCache = representatives.map(rep => ({
        name: rep.name,
        current_party: { 
          short_name: { 
            en: rep.party_name || 'Independent' 
          } 
        },
        current_riding: { 
          name: { 
            en: rep.district_name || 'Unknown' 
          }, 
          province: rep.offices?.[0]?.postal_code?.substring(0, 2) || 'Unknown'
        },
        image: rep.photo_url || null,
        url: `/politicians/${rep.name.toLowerCase().replace(/\s+/g, '-')}/`,
        email: rep.email || null,
        phone: rep.offices?.[0]?.tel || null
      }));
      
      cacheTimestamp = now;
      console.log(`Successfully fetched ${politiciansCache.length} politicians from Represent API`);
      return politiciansCache;
    }
  } catch (error: any) {
    console.log('Represent API unavailable, using sample data:', error?.message || String(error));
  }
  
  // Use sample data when API is unavailable
  if (politiciansCache.length === 0) {
    console.log('Loading sample politician data for demonstration');
    politiciansCache = SAMPLE_POLITICIANS;
    cacheTimestamp = now;
  }
  
  return politiciansCache;
}

async function fetchDetailedMPInfo(mpName: string): Promise<any> {
  try {
    const nameSlug = mpName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    console.log(`Fetching detailed info for: ${mpName} (slug: ${nameSlug})`);
    
    const response = await fetch(`https://openparliament.ca/politicians/${nameSlug}/?format=json`, {
      headers: {
        'User-Agent': 'FindMyRep/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const detailedData = await response.json();
      console.log(`Successfully fetched detailed info for ${mpName}:`, {
        hasImage: !!detailedData.image,
        hasEmail: !!detailedData.email,
        imageUrl: detailedData.image
      });
      return detailedData;
    } else {
      console.log(`Failed to fetch detailed info for ${mpName}: ${response.status}`);
    }
  } catch (error) {
    console.log(`Error fetching detailed info for ${mpName}:`, error);
  }
  return null;
}

async function searchByPostalCode(postalCode: string): Promise<OpenParliamentRepresentative[]> {
  try {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    console.log(`Searching for postal code: ${cleanPostalCode}`);
    
    const response = await fetch(`https://represent.opennorth.ca/postcodes/${cleanPostalCode}/`, {
      headers: {
        'User-Agent': 'FindMyRep/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Postal code lookup failed: ${response.status}`);
    }
    
    const data = await response.json();
    const representatives = data.representatives_centroid || data.representatives_concordance || [];
    
    // Filter for current MPs (incumbents) only - exclude candidates
    const currentMPs = representatives.filter((rep: any) => 
      rep.elected_office === 'MP' && rep.incumbent === true
    );
    
    console.log(`Found ${currentMPs.length} current MPs for postal code ${cleanPostalCode}`);
    
    if (currentMPs.length === 0) {
      console.log('No current MPs found, checking all representatives...');
      // Fallback: look for any representative with MP office
      const allMPs = representatives.filter((rep: any) => 
        rep.elected_office === 'MP' || rep.district_name
      );
      console.log(`Found ${allMPs.length} total MPs/representatives`);
    }
    
    const repsToTransform = currentMPs.length > 0 ? currentMPs : representatives.filter((rep: any) => rep.elected_office === 'MP');
    
    // Enhance data with detailed MP information
    const enhancedReps = await Promise.all(repsToTransform.map(async (rep: any) => {
      const detailedInfo = await fetchDetailedMPInfo(rep.name);
      
      // Extract office information
      const offices = [];
      
      // Legislature office from detailed info
      if (detailedInfo?.voice || detailedInfo?.email) {
        offices.push({
          type: 'Legislature Office',
          address: 'House of Commons Ottawa ON K1A 0A6',
          phone: detailedInfo.voice || '1 613 992-4501',
          fax: detailedInfo.other_info?.fax || '1 613 992-4501',
          email: detailedInfo.email
        });
      }
      
      // Constituency office from Represent API or OpenParliament data
      if (rep.offices && rep.offices.length > 0) {
        rep.offices.forEach((office: any) => {
          offices.push({
            type: 'Constituency Office',
            address: office.postal_address || `Main office - ${rep.district_name}`,
            phone: office.tel,
            fax: office.fax
          });
        });
      } else if (detailedInfo?.other_info?.constituency_offices) {
        // Add constituency office from detailed MP info
        const constituencyOffice = detailedInfo.other_info.constituency_offices[0];
        if (constituencyOffice) {
          offices.push({
            type: 'Constituency Office',
            address: constituencyOffice,
            phone: '1 416 321-5454',
            fax: '1 416 321-5456'
          });
        }
      } else {
        // Add default constituency office for demonstration
        offices.push({
          type: 'Constituency Office',
          address: `Main office - ${rep.district_name}\n${rep.district_name} Office`,
          phone: '1 416 321-5454',
          fax: '1 416 321-5456'
        });
      }
      
      // Clean up URLs to prevent duplication and ensure proper photo display
      let photoUrl = null;
      if (detailedInfo?.image) {
        photoUrl = detailedInfo.image.startsWith('http') ? 
          detailedInfo.image : 
          `https://openparliament.ca${detailedInfo.image}`;
        console.log(`Using detailed info photo for ${rep.name}:`, photoUrl);
      } else if (rep.photo_url) {
        // Fix duplicate domain issue in cached data
        if (rep.photo_url.includes('openparliament.cahttps://')) {
          photoUrl = rep.photo_url.replace('openparliament.cahttps://', 'https://');
        } else if (rep.photo_url.startsWith('http')) {
          photoUrl = rep.photo_url;
        } else {
          photoUrl = `https://openparliament.ca${rep.photo_url}`;
        }
        console.log(`Using fallback photo for ${rep.name}:`, photoUrl);
      }
      
      let profileUrl = rep.url || null;
      if (detailedInfo?.url) {
        profileUrl = detailedInfo.url.startsWith('http') ? 
          detailedInfo.url : 
          `https://openparliament.ca${detailedInfo.url}`;
      }

      // Enhanced biography information from API
      let biography = null;
      if (detailedInfo) {
        const party = detailedInfo.memberships?.[0]?.party?.name?.en || rep.party_name;
        const riding = detailedInfo.memberships?.[0]?.riding?.name?.en || rep.district_name;
        const startDate = detailedInfo.memberships?.[0]?.start_date;
        
        biography = `${rep.name} is the Member of Parliament for ${riding}, representing the ${party}`;
        if (startDate) {
          const year = new Date(startDate).getFullYear();
          biography += ` since ${year}`;
        }
        biography += '.';
        
        // Add any additional bio info if available
        if (detailedInfo.other_info?.biography) {
          biography += `\n\n${detailedInfo.other_info.biography}`;
        }
      } else {
        biography = `${rep.name} is the Member of Parliament for ${rep.district_name}, representing the ${rep.party_name} party.`;
      }

      return {
        name: rep.name,
        current_party: { 
          short_name: { 
            en: rep.party_name || 'Independent' 
          } 
        },
        current_riding: { 
          name: { 
            en: rep.district_name || 'Unknown' 
          }, 
          province: data.province || 'Unknown'
        },
        image: photoUrl?.replace('openparliament.cahttps://', 'https://') || null,
        url: profileUrl?.replace('openparliament.cahttps://', 'https://') || null,
        email: detailedInfo?.email || rep.email || `${rep.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`,
        phone: detailedInfo?.voice || rep.offices?.[0]?.tel || '1 613 992-4501',
        personalWebsite: rep.personal_url,
        website: detailedInfo?.links?.[0]?.url || profileUrl,
        socialMedia: {
          twitter: detailedInfo?.other_info?.twitter?.[0] || rep.extra?.twitter,
          ...rep.extra
        },
        biography: biography,
        offices: offices,
        fax: detailedInfo?.other_info?.fax || '1 613 992-4501',
        parliamentId: detailedInfo?.other_info?.parl_mp_id?.[0] || rep.name.toLowerCase().replace(/\s+/g, '-')
      };
    }));
    
    return enhancedReps;
    
  } catch (error: any) {
    console.error('Postal code search error:', error?.message || String(error));
    return [];
  }
}

async function searchOpenParliament(query: string, type: 'postal_code' | 'name' | 'riding' = 'postal_code'): Promise<OpenParliamentRepresentative[]> {
  try {
    if (type === 'postal_code') {
      // Use direct postal code API lookup
      return await searchByPostalCode(query);
    }
    
    // For name and riding searches, use cached politician data
    const allPoliticians = await getAllPoliticians();
    
    if (allPoliticians.length === 0) {
      console.log('No politicians data available');
      return [];
    }
    
    if (type === 'name') {
      const searchName = query.toLowerCase();
      return allPoliticians.filter((politician: OpenParliamentRepresentative) => {
        return politician.name.toLowerCase().includes(searchName);
      });
    } else if (type === 'riding') {
      const searchRiding = query.toLowerCase();
      return allPoliticians.filter((politician: OpenParliamentRepresentative) => {
        const ridingName = politician.current_riding?.name?.en || '';
        return ridingName.toLowerCase().includes(searchRiding);
      });
    }
    
    return [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

function transformOpenParliamentData(apiRep: OpenParliamentRepresentative): any {
  const baseUrl = 'https://openparliament.ca';
  
  // Ensure clean URL construction
  const cleanImageUrl = apiRep.image ? 
    (apiRep.image.startsWith('http') ? apiRep.image : `${baseUrl}${apiRep.image}`) : null;
  const cleanProfileUrl = apiRep.url ? 
    (apiRep.url.startsWith('http') ? apiRep.url : `${baseUrl}${apiRep.url}`) : null;
  
  return {
    name: apiRep.name,
    party: apiRep.current_party?.short_name?.en || 'Unknown',
    constituency: apiRep.current_riding?.name?.en || 'Unknown',
    province: apiRep.current_riding?.province || 'Unknown',
    email: null,
    phone: null,
    photo: cleanImageUrl,
    website: cleanProfileUrl,
    personalWebsite: null,
    socialMedia: {},
    biography: null,
    offices: [],
    fax: null,
    parliamentId: apiRep.url ? apiRep.url.split('/').slice(-2, -1)[0] : null,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Search representatives by postal code or location
  app.post("/api/representatives/search", async (req, res) => {
    try {
      const { query, type = 'postal_code' } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Search OpenParliament API
      const apiResults = await searchOpenParliament(query, type);
      
      // Transform and store representatives
      const representatives = [];
      for (const apiRep of apiResults) {
        const transformedData = transformOpenParliamentData(apiRep);
        
        // Check if representative already exists
        let representative = await storage.getRepresentativeByParliamentId(transformedData.parliamentId);
        
        if (!representative) {
          // Create new representative
          representative = await storage.createRepresentative(transformedData);
        }
        
        representatives.push(representative);
      }

      // Save search query
      await storage.createSearch({
        query,
        location: type === 'postal_code' ? query : undefined,
        postalCode: type === 'postal_code' ? query : undefined,
        results: representatives,
      });

      res.json({ representatives });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: "Failed to search representatives" });
    }
  });

  // Get representative by ID
  app.get("/api/representatives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const representative = await storage.getRepresentative(id);
      
      if (!representative) {
        return res.status(404).json({ message: "Representative not found" });
      }

      res.json(representative);
    } catch (error) {
      res.status(500).json({ message: "Failed to get representative" });
    }
  });

  // Get recent searches
  app.get("/api/searches/recent", async (req, res) => {
    try {
      const searches = await storage.getRecentSearches(5);
      res.json(searches);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent searches" });
    }
  });

  // Save representative
  app.post("/api/representatives/:id/save", async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      // Check if already saved
      const alreadySaved = await storage.isSaved(userId, representativeId);
      if (alreadySaved) {
        return res.status(409).json({ message: "Representative already saved" });
      }

      const saved = await storage.saveRepresentative({
        representativeId,
        userId,
      });

      res.json(saved);
    } catch (error) {
      res.status(500).json({ message: "Failed to save representative" });
    }
  });

  // Remove saved representative
  app.delete("/api/representatives/:id/save", async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const removed = await storage.removeSavedRepresentative(userId, representativeId);
      
      if (!removed) {
        return res.status(404).json({ message: "Saved representative not found" });
      }

      res.json({ message: "Representative removed from saved list" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove saved representative" });
    }
  });

  // Get saved representatives
  app.get("/api/saved/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const saved = await storage.getSavedRepresentatives(userId);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ message: "Failed to get saved representatives" });
    }
  });

  // Geocoding endpoint for address to postal code conversion
  app.post("/api/geocode", async (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      // Simple geocoding - in a real app, you'd use a service like Google Maps API
      // For now, we'll just return the address as-is and let the frontend handle it
      res.json({ 
        postalCode: null, 
        address,
        message: "Please use postal code for more accurate results" 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to geocode address" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
