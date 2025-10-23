/**
 * Hybrid API Routes
 * New routes that use multiple data sources for improved accuracy
 */

import type { Express } from "express";
import { lookupPostalCode, correctPostalCodeMapping, getAllCachedPostalCodes } from './hybridPostalCodeService';
import { getAllMPsFromHouseOfCommons, getMPByRiding, searchMPsByName } from './houseOfCommonsService';
import { scrapeMPContactInfo, scrapeAllMPContacts } from './mpContactScraper';
import { getBoundaryData, getBoundaryMetadata } from './boundaryService';
import { storage } from "./storage";

/**
 * Register hybrid API routes
 * These routes use the new multi-source hybrid approach
 */
export function registerHybridRoutes(app: Express) {
  /**
   * Enhanced postal code search
   * Uses cache → Represent API → House of Commons verification
   */
  app.post("/api/v2/representatives/postal-code", async (req, res) => {
    try {
      const { postalCode } = req.body;

      if (!postalCode) {
        return res.status(400).json({ message: "Postal code is required" });
      }

      // Look up postal code using hybrid service
      const lookupResult = await lookupPostalCode(postalCode);

      if (!lookupResult) {
        return res.status(404).json({
          message: "No representative found for this postal code",
          postalCode,
        });
      }

      // Get full MP details from House of Commons
      const mp = await getMPByRiding(lookupResult.ridingName);

      if (!mp) {
        return res.status(404).json({
          message: "MP found but details unavailable",
          riding: lookupResult.ridingName,
        });
      }

      // Try to get contact details (this can be slow, so we might skip it initially)
      let contactInfo = null;
      if (mp.profileUrl) {
        contactInfo = await scrapeMPContactInfo(mp.profileUrl);
      }

      // Get boundary data if available
      let boundaryData = null;
      if (lookupResult.boundaryUrl) {
        boundaryData = await getBoundaryMetadata(lookupResult.boundaryUrl);
      }

      // Construct representative object
      const representative = {
        name: mp.name,
        party: mp.party,
        constituency: mp.constituency,
        province: mp.province,
        email: contactInfo?.email || mp.email,
        phone: contactInfo?.phone,
        photo: contactInfo?.photoUrl,
        offices: contactInfo?.offices || [],
        parliamentId: mp.id,
        profileUrl: mp.profileUrl,
        boundaryUrl: lookupResult.boundaryUrl,
        boundary: boundaryData,
        dataQuality: {
          source: lookupResult.source,
          confidence: lookupResult.confidence,
          warnings: lookupResult.warnings,
        },
      };

      // Save search for activity tracking
      await storage.createSearch({
        query: postalCode,
        postalCode: postalCode,
        results: [representative],
      });

      res.json({
        representative,
        lookup: {
          postalCode: lookupResult.postalCode,
          riding: lookupResult.ridingName,
          province: lookupResult.province,
          source: lookupResult.source,
          confidence: lookupResult.confidence,
        },
      });
    } catch (error: any) {
      console.error('Postal code search error:', error);
      res.status(500).json({
        message: "Failed to search by postal code",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Search MPs by name using House of Commons data
   */
  app.post("/api/v2/representatives/search-name", async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const mps = await searchMPsByName(name);

      res.json({
        representatives: mps.map(mp => ({
          name: mp.name,
          party: mp.party,
          constituency: mp.constituency,
          province: mp.province,
          email: mp.email,
          parliamentId: mp.id,
          profileUrl: mp.profileUrl,
        })),
        count: mps.length,
        source: 'house_of_commons',
      });
    } catch (error: any) {
      console.error('Name search error:', error);
      res.status(500).json({
        message: "Failed to search by name",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Get all current MPs from House of Commons
   */
  app.get("/api/v2/representatives/all", async (req, res) => {
    try {
      const mps = await getAllMPsFromHouseOfCommons();

      res.json({
        representatives: mps,
        count: mps.length,
        source: 'house_of_commons',
        cachedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Get all MPs error:', error);
      res.status(500).json({
        message: "Failed to get MPs",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Get MP details by riding name
   */
  app.get("/api/v2/representatives/riding/:ridingName", async (req, res) => {
    try {
      const { ridingName } = req.params;

      const mp = await getMPByRiding(decodeURIComponent(ridingName));

      if (!mp) {
        return res.status(404).json({
          message: "No MP found for this riding",
          riding: ridingName,
        });
      }

      // Try to get contact details
      let contactInfo = null;
      if (mp.profileUrl) {
        contactInfo = await scrapeMPContactInfo(mp.profileUrl);
      }

      res.json({
        representative: {
          ...mp,
          offices: contactInfo?.offices || [],
          phone: contactInfo?.phone || mp.email,
          photoUrl: contactInfo?.photoUrl,
        },
      });
    } catch (error: any) {
      console.error('Get MP by riding error:', error);
      res.status(500).json({
        message: "Failed to get MP",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Get enhanced boundary data
   * Uses Statistics Canada WMS with fallback to Represent API
   */
  app.get("/api/v2/boundaries/:ridingName", async (req, res) => {
    try {
      const { ridingName } = req.params;
      const { province } = req.query;

      const boundary = await getBoundaryData(
        decodeURIComponent(ridingName),
        province as string | undefined
      );

      if (!boundary) {
        return res.status(404).json({
          message: "Boundary data not found",
          riding: ridingName,
        });
      }

      res.json(boundary);
    } catch (error: any) {
      console.error('Get boundary error:', error);
      res.status(500).json({
        message: "Failed to get boundary data",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Admin endpoint: Manually correct postal code mapping
   * Used to fix known inaccuracies near riding boundaries
   */
  app.post("/api/v2/admin/postal-code-correction", async (req, res) => {
    try {
      const { postalCode, ridingName, province, notes } = req.body;

      if (!postalCode || !ridingName || !province) {
        return res.status(400).json({
          message: "postalCode, ridingName, and province are required",
        });
      }

      const correction = await correctPostalCodeMapping(
        postalCode,
        ridingName,
        province,
        notes
      );

      res.json({
        message: "Postal code correction saved",
        correction,
      });
    } catch (error: any) {
      console.error('Postal code correction error:', error);
      res.status(500).json({
        message: "Failed to save correction",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Admin endpoint: Get all cached postal codes
   */
  app.get("/api/v2/admin/postal-code-cache", async (req, res) => {
    try {
      const cache = getAllCachedPostalCodes();

      res.json({
        cache,
        count: cache.length,
      });
    } catch (error: any) {
      console.error('Get postal code cache error:', error);
      res.status(500).json({
        message: "Failed to get cache",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Scrape contact info for a specific MP
   * Resource-intensive, use sparingly
   */
  app.post("/api/v2/admin/scrape-mp-contact", async (req, res) => {
    try {
      const { profileUrl } = req.body;

      if (!profileUrl) {
        return res.status(400).json({ message: "profileUrl is required" });
      }

      const contactInfo = await scrapeMPContactInfo(profileUrl);

      if (!contactInfo) {
        return res.status(404).json({
          message: "Could not scrape contact info",
          profileUrl,
        });
      }

      res.json({
        contactInfo,
        scrapedAt: new Date(),
      });
    } catch (error: any) {
      console.error('Scrape MP contact error:', error);
      res.status(500).json({
        message: "Failed to scrape contact info",
        error: error?.message || String(error),
      });
    }
  });

  /**
   * Batch scrape all MP contacts
   * Very resource-intensive - should be run periodically, not on demand
   */
  app.post("/api/v2/admin/scrape-all-contacts", async (req, res) => {
    try {
      // This should really be a background job
      res.status(202).json({
        message: "Scraping started - this will take several minutes",
        note: "In production, this should be a background job",
      });

      // Run scraping in background (in production, use a queue)
      scrapeAllMPContacts()
        .then(contacts => {
          console.log(`Successfully scraped ${contacts.length} MP contacts`);
        })
        .catch(error => {
          console.error('Batch scraping failed:', error);
        });
    } catch (error: any) {
      console.error('Batch scrape error:', error);
      res.status(500).json({
        message: "Failed to start scraping",
        error: error?.message || String(error),
      });
    }
  });
}
