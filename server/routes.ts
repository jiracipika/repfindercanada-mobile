import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { InsertRepresentative, InsertSearch, InsertSavedRepresentative } from "@shared/types";
import { z } from "zod";
import { representApi } from "./representApiService";
import { enhancedPostalCodeService } from "./enhancedPostalCodeService";
import type { Representative, Boundary, ApiResponse, Election, Candidate } from "./representApiService";

// Basic Zod schemas for validation
const insertRepresentativeSchema = z.object({
  name: z.string(),
  party: z.string(),
  constituency: z.string(),
  province: z.string(),
  electedOffice: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  photo: z.string().nullable(),
  website: z.string().nullable(),
  personalWebsite: z.string().nullable(),
  socialMedia: z.any().nullable(),
  biography: z.string().nullable(),
  offices: z.any().nullable(),
  fax: z.string().nullable(),
  parliamentId: z.string().nullable()
});

const insertSearchSchema = z.object({
  query: z.string(),
  location: z.string().nullable(),
  postalCode: z.string().nullable(),
  results: z.any()
});

const insertSavedRepresentativeSchema = z.object({
  representativeId: z.number().nullable(),
  userId: z.string()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Enhanced search using best practices from Represent API documentation
  app.post("/api/representatives/search", async (req, res) => {
    try {
      const { query, type = 'postal_code', limit = 20, offset = 0 } = req.body;

      if (!query && type !== 'coordinates') {
        return res.status(400).json({ message: "Query is required" });
      }

      console.log(`[Enhanced Search] ${type} search for: ${query || 'coordinates'}`);

      let searchResults: {
        representatives: Representative[];
        metadata?: any;
        warnings?: string[];
        confidence?: string;
      } = { representatives: [] };

      switch (type) {
        case 'postal_code':
          // Use enhanced postal code service with coordinate conversion
          const postalResult = await enhancedPostalCodeService.lookupPostalCode(query);
          searchResults = {
            representatives: postalResult.representatives,
            metadata: {
              coordinates: postalResult.coordinates,
              boundaries: postalResult.boundaries,
              dataSource: postalResult.dataSource
            },
            warnings: postalResult.warnings,
            confidence: postalResult.confidence
          };
          break;

        case 'name':
          // Use enhanced name search with proper filtering
          const nameResult = await representApi.searchAllRepresentatives({
            name: query,
            limit,
            offset
          });
          searchResults = {
            representatives: nameResult.objects,
            metadata: {
              totalCount: nameResult.meta.total_count,
              hasMore: !!nameResult.meta.next
            }
          };
          break;

        case 'riding':
          // Search by electoral district name
          const ridingResult = await representApi.searchAllRepresentatives({
            district_name: query,
            limit,
            offset
          });
          searchResults = {
            representatives: ridingResult.objects,
            metadata: {
              totalCount: ridingResult.meta.total_count,
              hasMore: !!ridingResult.meta.next
            }
          };
          break;

        case 'coordinates':
          // Search by lat/lng coordinates (most accurate method)
          const { lat, lng } = req.body;
          if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude required for coordinate search" });
          }
          const coordResult = await representApi.findRepresentativesByCoordinates(parseFloat(lat), parseFloat(lng));
          searchResults = {
            representatives: coordResult,
            metadata: {
              coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
              searchType: 'coordinate'
            }
          };
          break;

        default:
          return res.status(400).json({ message: "Invalid search type. Use: postal_code, name, riding, or coordinates" });
      }

      // Transform and store representatives
      const transformedRepresentatives = [];
      for (const apiRep of searchResults.representatives) {
        const transformedData = transformRepresentativeData(apiRep);

        // Check if representative already exists
        let representative = await storage.getRepresentativeByParliamentId(transformedData.parliamentId);

        if (!representative) {
          representative = await storage.createRepresentative(transformedData);
        }

        transformedRepresentatives.push(representative);
      }

      // Save search query
      await storage.createSearch({
        query: query || `${lat},${lng}`,
        location: type === 'postal_code' ? query : undefined,
        postalCode: type === 'postal_code' ? query : undefined,
        results: transformedRepresentatives,
      });

      res.json({
        representatives: transformedRepresentatives,
        metadata: searchResults.metadata,
        warnings: searchResults.warnings || [],
        confidence: searchResults.confidence || 'medium',
        dataSource: 'represent_api_enhanced',
        note: `Enhanced search using Represent API best practices. Method: ${type}`
      });
    } catch (error) {
      console.error('Enhanced search error:', error);
      res.status(500).json({
        message: "Failed to search representatives",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Transform Representative API data to our format
  function transformRepresentativeData(apiRep: Representative): InsertRepresentative {
    return {
      name: apiRep.name,
      party: apiRep.party_name || 'Independent',
      constituency: apiRep.district_name || 'Unknown',
      province: extractProvinceFromDistrict(apiRep.district_name) || 'Unknown',
      electedOffice: apiRep.elected_office,
      email: apiRep.email || null,
      phone: apiRep.offices?.[0]?.tel || null,
      photo: apiRep.photo_url || null,
      website: apiRep.url || null,
      personalWebsite: null,
      socialMedia: null,
      biography: generateBiography(apiRep),
      offices: apiRep.offices || null,
      fax: apiRep.offices?.[0]?.fax || null,
      parliamentId: generateParliamentId(apiRep)
    };
  }

  function extractProvinceFromDistrict(districtName?: string): string | null {
    if (!districtName) return null;

    // Map common district patterns to provinces
    const provincePatterns = [
      { pattern: /\b(Alberta|AB)\b/i, province: 'Alberta' },
      { pattern: /\b(British Columbia|BC|B\.C\.)\b/i, province: 'British Columbia' },
      { pattern: /\b(Manitoba|MB)\b/i, province: 'Manitoba' },
      { pattern: /\b(New Brunswick|NB|N\.B\.)\b/i, province: 'New Brunswick' },
      { pattern: /\b(Newfoundland and Labrador|NL|N\.L\.)\b/i, province: 'Newfoundland and Labrador' },
      { pattern: /\b(Nova Scotia|NS|N\.S\.)\b/i, province: 'Nova Scotia' },
      { pattern: /\b(Ontario|ON)\b/i, province: 'Ontario' },
      { pattern: /\b(Prince Edward Island|PEI|P\.E\.I\.)\b/i, province: 'Prince Edward Island' },
      { pattern: /\b(Quebec|QC|PQ)\b/i, province: 'Quebec' },
      { pattern: /\b(Saskatchewan|SK)\b/i, province: 'Saskatchewan' },
      { pattern: /\b(Northwest Territories|NT|N\.W\.T\.)\b/i, province: 'Northwest Territories' },
      { pattern: /\b(Yukon|YT)\b/i, province: 'Yukon' },
      { pattern: /\b(Nunavut|NU)\b/i, province: 'Nunavut' }
    ];

    for (const { pattern, province } of provincePatterns) {
      if (pattern.test(districtName)) {
        return province;
      }
    }

    return null;
  }

  function generateBiography(rep: Representative): string {
    const position = getElectedOfficeTitle(rep.elected_office);
    return `${rep.name} serves as the ${position} for ${rep.district_name}, representing the ${rep.party_name || 'Independent'}.`;
  }

  function getElectedOfficeTitle(office?: string): string {
    if (!office) return 'Representative';

    const officeTitles: Record<string, string> = {
      'MP': 'Member of Parliament',
      'MPP': 'Member of Provincial Parliament',
      'MLA': 'Member of Legislative Assembly',
      'MNA': 'Member of National Assembly',
      'Mayor': 'Mayor',
      'Councillor': 'City Councillor'
    };

    return officeTitles[office] || office || 'Representative';
  }

  function generateParliamentId(apiRep: Representative): string {
    // Use the Represent API URL as a unique identifier
    if (apiRep.url) {
      return apiRep.url.split('/').filter(Boolean).pop() || apiRep.name;
    }
    return apiRep.name;
  }

  // Additional Represent API endpoints

  // Get all boundary sets
  app.get("/api/boundary-sets", async (req, res) => {
    try {
      const { name, domain, limit = 20, offset = 0 } = req.query;
      const result = await representApi.getBoundarySets({
        name: name as string,
        domain: domain as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(result);
    } catch (error) {
      console.error('Boundary sets error:', error);
      res.status(500).json({ message: "Failed to fetch boundary sets" });
    }
  });

  // Search boundaries within a boundary set
  app.get("/api/boundaries/:boundarySetName/search", async (req, res) => {
    try {
      const { boundarySetName } = req.params;
      const { name, contains, touches, intersects, limit = 20, offset = 0 } = req.query;

      const result = await representApi.getBoundaries(boundarySetName, {
        name: name as string,
        contains: contains as string,
        touches: touches as string,
        intersects: intersects as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(result);
    } catch (error) {
      console.error('Boundary search error:', error);
      res.status(500).json({ message: "Failed to search boundaries" });
    }
  });

  // Get specific boundary with shape data
  app.get("/api/boundaries/:boundaryUrl(*)", async (req, res) => {
    try {
      const { boundaryUrl } = req.params;
      const boundary = await representApi.getBoundary(`/${boundaryUrl}`);

      // Include shape data for map display
      let shapeData = null;
      if (boundary.simple_shape_url) {
        try {
          shapeData = await representApi.getBoundarySimpleShape(boundary.url);
        } catch (shapeError) {
          console.warn('Failed to fetch boundary shape:', shapeError);
        }
      }

      res.json({
        boundary,
        shapeData,
        metadata: {
          dataSource: 'represent_api',
          hasShapeData: !!shapeData
        }
      });
    } catch (error) {
      console.error('Boundary details error:', error);
      res.status(500).json({ message: "Failed to fetch boundary details" });
    }
  });

  // Coordinate-based search (most accurate method)
  app.post("/api/search/coordinates", async (req, res) => {
    try {
      const { lat, lng, boundarySetName } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const representatives = await representApi.findRepresentativesByCoordinates(
        parseFloat(lat),
        parseFloat(lng)
      );

      const boundaries = await representApi.findBoundariesByCoordinates(
        parseFloat(lat),
        parseFloat(lng),
        boundarySetName
      );

      res.json({
        representatives,
        boundaries,
        coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        metadata: {
          representativeCount: representatives.length,
          boundaryCount: boundaries.length,
          searchType: 'coordinate',
          dataSource: 'represent_api'
        }
      });
    } catch (error) {
      console.error('Coordinate search error:', error);
      res.status(500).json({ message: "Failed to search by coordinates" });
    }
  });

  // Get representative sets
  app.get("/api/representative-sets", async (req, res) => {
    try {
      const { name, limit = 20, offset = 0 } = req.query;
      const result = await representApi.getRepresentativeSets({
        name: name as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(result);
    } catch (error) {
      console.error('Representative sets error:', error);
      res.status(500).json({ message: "Failed to fetch representative sets" });
    }
  });

  // Get elections
  app.get("/api/elections", async (req, res) => {
    try {
      const { name, limit = 20, offset = 0 } = req.query;
      const result = await representApi.getElections({
        name: name as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(result);
    } catch (error) {
      console.error('Elections error:', error);
      res.status(500).json({ message: "Failed to fetch elections" });
    }
  });

  // Get election candidates
  app.get("/api/elections/:electionUrl/candidates", async (req, res) => {
    try {
      const { electionUrl } = req.params;
      const { name, first_name, last_name, gender, district_name, party_name, elected_office, limit = 20, offset = 0 } = req.query;

      const result = await representApi.getCandidates(`/${electionUrl}`, {
        name: name as string,
        first_name: first_name as string,
        last_name: last_name as string,
        gender: gender as string,
        district_name: district_name as string,
        party_name: party_name as string,
        elected_office: elected_office as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      res.json(result);
    } catch (error) {
      console.error('Candidates error:', error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  // Bulk download representatives
  app.get("/api/bulk/representatives/:representativeSetName", async (req, res) => {
    try {
      const { representativeSetName } = req.params;
      const representatives = await representApi.getAllRepresentativesBulk(representativeSetName);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${representativeSetName}.json"`);
      res.json(representatives);
    } catch (error) {
      console.error('Bulk download error:', error);
      res.status(500).json({ message: "Failed to download representatives" });
    }
  });

  // Postal code validation
  app.post("/api/postal-code/validate", async (req, res) => {
    try {
      const { postalCode } = req.body;

      if (!postalCode) {
        return res.status(400).json({ message: "Postal code is required" });
      }

      const isValid = enhancedPostalCodeService.isValidCanadianPostalCode(postalCode);
      const formatted = enhancedPostalCodeService.formatPostalCode(postalCode);
      const clean = formatted.replace(/\s+/g, '');

      res.json({
        original: postalCode,
        isValid,
        formatted: isValid ? formatted : postalCode,
        clean: isValid ? clean : postalCode
      });
    } catch (error) {
      console.error('Postal code validation error:', error);
      res.status(500).json({ message: "Failed to validate postal code" });
    }
  });

  // Get all representatives (for initial app load)
  app.post("/api/representatives", async (req, res) => {
    try {
      const { limit = 1000 } = req.body;

      // Get all federal MPs
      const result = await representApi.getRepresentatives('house-of-commons', {
        elected_office: 'MP',
        limit: parseInt(limit)
      });

      // Transform and store representatives
      const transformedRepresentatives = [];
      for (const apiRep of result.objects) {
        const transformedData = transformRepresentativeData(apiRep);

        // Check if representative already exists
        let representative = await storage.getRepresentativeByParliamentId(transformedData.parliamentId);

        if (!representative) {
          representative = await storage.createRepresentative(transformedData);
        }

        transformedRepresentatives.push(representative);
      }

      res.json({
        representatives: transformedRepresentatives,
        metadata: {
          totalCount: result.meta.total_count,
          dataSource: 'represent_api_enhanced',
          note: 'Federal MPs loaded from Represent API'
        }
      });
    } catch (error) {
      console.error('Get representatives error:', error);
      res.status(500).json({ message: "Failed to fetch representatives" });
    }
  });

  // Get single representative by ID
  app.get("/api/representatives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const representative = await storage.getRepresentative(parseInt(id));

      if (!representative) {
        return res.status(404).json({ message: "Representative not found" });
      }

      res.json(representative);
    } catch (error) {
      console.error('Get representative error:', error);
      res.status(500).json({ message: "Failed to fetch representative" });
    }
  });

  // Save representative
  app.post("/api/saved-representatives", async (req, res) => {
    try {
      const data = insertSavedRepresentativeSchema.parse(req.body);
      const savedRep = await storage.createSavedRepresentative(data);
      res.json(savedRep);
    } catch (error) {
      console.error('Save representative error:', error);
      res.status(500).json({ message: "Failed to save representative" });
    }
  });

  // Get saved representatives for user
  app.get("/api/saved-representatives/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const savedReps = await storage.getSavedRepresentatives(userId);
      res.json(savedReps);
    } catch (error) {
      console.error('Get saved representatives error:', error);
      res.status(500).json({ message: "Failed to fetch saved representatives" });
    }
  });

  // Remove saved representative
  app.delete("/api/saved-representatives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSavedRepresentative(parseInt(id));
      res.json({ message: "Saved representative removed successfully" });
    } catch (error) {
      console.error('Remove saved representative error:', error);
      res.status(500).json({ message: "Failed to remove saved representative" });
    }
  });

  // Get search history for user
  app.get("/api/searches/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const searches = await storage.getSearches(userId);
      res.json(searches);
    } catch (error) {
      console.error('Get searches error:', error);
      res.status(500).json({ message: "Failed to fetch searches" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}