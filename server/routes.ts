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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

async function getAllPoliticians(): Promise<OpenParliamentRepresentative[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (politiciansCache.length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
    return politiciansCache;
  }
  
  try {
    console.log('Fetching politicians from OpenParliament.ca API...');
    const response = await fetch('https://openparliament.ca/politicians/?format=json&limit=338', {
      headers: {
        'User-Agent': 'FindMyRep/1.0 (https://findmyrep.replit.app)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenParliament API error: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    console.log('API Response (first 200 chars):', text.substring(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.log('Response text:', text.substring(0, 500));
      throw new Error('Invalid JSON response from OpenParliament API');
    }

    const newCache = data.objects || data.results || data || [];
    if (Array.isArray(newCache)) {
      politiciansCache = newCache;
      cacheTimestamp = now;
      
      console.log(`Fetched ${politiciansCache.length} politicians from OpenParliament.ca`);
      
      // Log sample politician structure
      if (politiciansCache.length > 0) {
        console.log('Sample politician structure:', JSON.stringify(politiciansCache[0], null, 2));
      }
    }
    
    return politiciansCache;
  } catch (error) {
    console.error('OpenParliament API error:', error);
    
    // If we have cached data, return it even if expired
    if (politiciansCache.length > 0) {
      console.log('Using cached politician data due to API error');
      return politiciansCache;
    }
    
    return [];
  }
}

async function searchOpenParliament(query: string, type: 'postal_code' | 'name' | 'riding' = 'postal_code'): Promise<OpenParliamentRepresentative[]> {
  try {
    const allPoliticians = await getAllPoliticians();
    
    if (allPoliticians.length === 0) {
      console.log('No politicians data available');
      return [];
    }
    
    // Filter based on search type
    if (type === 'postal_code') {
      const postalPrefix = query.replace(/\s+/g, '').toUpperCase().substring(0, 3);
      const possibleRidings = POSTAL_CODE_TO_RIDING[postalPrefix] || [];
      
      console.log(`Searching for postal code ${query} (prefix: ${postalPrefix}), mapped to ridings:`, possibleRidings);
      
      if (possibleRidings.length === 0) {
        console.log('No riding mapping found for postal code prefix:', postalPrefix);
        return [];
      }
      
      const results = allPoliticians.filter((politician: OpenParliamentRepresentative) => {
        const ridingName = politician.current_riding?.name?.en || '';
        return possibleRidings.some(riding => {
          const match = ridingName.toLowerCase().includes(riding.toLowerCase()) ||
                       riding.toLowerCase().includes(ridingName.toLowerCase());
          if (match) {
            console.log(`Found match: ${politician.name} in ${ridingName}`);
          }
          return match;
        });
      });
      
      console.log(`Found ${results.length} politicians for postal code ${query}`);
      return results;
    } else if (type === 'name') {
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
  return {
    name: apiRep.name,
    party: apiRep.current_party?.short_name?.en || 'Unknown',
    constituency: apiRep.current_riding?.name?.en || 'Unknown',
    province: apiRep.current_riding?.province || 'Unknown',
    email: null, // Not provided by this API endpoint
    phone: null, // Not provided by this API endpoint
    photo: apiRep.image ? `${baseUrl}${apiRep.image}` : null,
    website: apiRep.url ? `${baseUrl}${apiRep.url}` : null,
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
