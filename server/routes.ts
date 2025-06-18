import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRepresentativeSchema, insertSearchSchema, insertSavedRepresentativeSchema } from "@shared/schema";
import { z } from "zod";

interface OpenParliamentRepresentative {
  name: string;
  party: {
    name: string;
  };
  riding: {
    name: string;
  };
  email?: string;
  phone?: string;
  image?: string;
  url?: string;
  parliament_id?: string;
}

async function searchOpenParliament(query: string, type: 'postal_code' | 'name' | 'riding' = 'postal_code'): Promise<OpenParliamentRepresentative[]> {
  try {
    let url = 'https://openparliament.ca/api/representatives/';
    
    if (type === 'postal_code') {
      url += `?postal_code=${encodeURIComponent(query)}`;
    } else if (type === 'name') {
      url += `?name=${encodeURIComponent(query)}`;
    } else if (type === 'riding') {
      url += `?riding=${encodeURIComponent(query)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenParliament API error: ${response.status}`);
    }

    const data = await response.json();
    return data.objects || [];
  } catch (error) {
    console.error('OpenParliament API error:', error);
    return [];
  }
}

function transformOpenParliamentData(apiRep: OpenParliamentRepresentative): any {
  return {
    name: apiRep.name,
    party: apiRep.party?.name || 'Unknown',
    constituency: apiRep.riding?.name || 'Unknown',
    province: 'Canada', // OpenParliament doesn't provide province directly
    email: apiRep.email,
    phone: apiRep.phone,
    photo: apiRep.image,
    website: apiRep.url,
    parliamentId: apiRep.parliament_id,
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
