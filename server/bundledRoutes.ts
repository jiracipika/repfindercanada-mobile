/**
 * Bundled Data API Routes (v3)
 * Uses bundled XML data with offline-first architecture
 */

import type { Express } from "express";
import {
  searchByPostalCode,
  searchByName,
  getAllRepresentatives,
  getRepresentativeById,
} from './representativeService';
import { getDataInfo, forceUpdateCheck } from './bundledDataLoader';

export function registerBundledRoutes(app: Express) {
  console.log('Registering v3 bundled data routes...');

  /**
   * POST /api/v3/representatives/postal-code
   * Search for MP by postal code
   */
  app.post("/api/v3/representatives/postal-code", async (req, res) => {
    try {
      const { postalCode } = req.body;

      if (!postalCode || typeof postalCode !== 'string') {
        return res.status(400).json({
          error: 'Missing or invalid postal code',
        });
      }

      const representative = await searchByPostalCode(postalCode, true);

      if (!representative) {
        return res.status(404).json({
          error: 'No representative found for this postal code',
          postalCode,
        });
      }

      return res.json({
        success: true,
        representative,
        meta: {
          apiVersion: 'v3',
          dataSource: representative.dataSource,
        },
      });

    } catch (error: any) {
      console.error('[v3 API] Postal code search error:', error);
      return res.status(500).json({
        error: 'Failed to search by postal code',
        message: error?.message || String(error),
      });
    }
  });

  /**
   * POST /api/v3/representatives/search-name
   * Search for MPs by name
   */
  app.post("/api/v3/representatives/search-name", async (req, res) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          error: 'Missing or invalid name',
        });
      }

      const representatives = await searchByName(name, false);

      return res.json({
        success: true,
        representatives,
        count: representatives.length,
        meta: {
          apiVersion: 'v3',
          dataSource: 'bundled',
        },
      });

    } catch (error: any) {
      console.error('[v3 API] Name search error:', error);
      return res.status(500).json({
        error: 'Failed to search by name',
        message: error?.message || String(error),
      });
    }
  });

  /**
   * GET /api/v3/representatives/all
   * Get all current MPs
   */
  app.get("/api/v3/representatives/all", async (req, res) => {
    try {
      const representatives = getAllRepresentatives();

      return res.json({
        success: true,
        representatives,
        count: representatives.length,
        meta: {
          apiVersion: 'v3',
          dataSource: 'bundled',
        },
      });

    } catch (error: any) {
      console.error('[v3 API] Get all representatives error:', error);
      return res.status(500).json({
        error: 'Failed to get representatives',
        message: error?.message || String(error),
      });
    }
  });

  /**
   * GET /api/v3/representatives/:id
   * Get single MP by ID with full contact info
   */
  app.get("/api/v3/representatives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const representative = await getRepresentativeById(id, true);

      if (!representative) {
        return res.status(404).json({
          error: 'Representative not found',
          id,
        });
      }

      return res.json({
        success: true,
        representative,
        meta: {
          apiVersion: 'v3',
          dataSource: representative.dataSource,
        },
      });

    } catch (error: any) {
      console.error('[v3 API] Get representative by ID error:', error);
      return res.status(500).json({
        error: 'Failed to get representative',
        message: error?.message || String(error),
      });
    }
  });

  /**
   * GET /api/v3/data/info
   * Get information about the bundled data
   */
  app.get("/api/v3/data/info", (req, res) => {
    try {
      const info = getDataInfo();
      return res.json({
        success: true,
        data: info,
      });
    } catch (error: any) {
      console.error('[v3 API] Get data info error:', error);
      return res.status(500).json({
        error: 'Failed to get data info',
        message: error?.message || String(error),
      });
    }
  });

  /**
   * POST /api/v3/data/update
   * Force check for data updates
   */
  app.post("/api/v3/data/update", async (req, res) => {
    try {
      const updated = await forceUpdateCheck();
      return res.json({
        success: true,
        updated,
        message: updated
          ? 'Data updated successfully'
          : 'No updates available',
      });
    } catch (error: any) {
      console.error('[v3 API] Force update error:', error);
      return res.status(500).json({
        error: 'Failed to check for updates',
        message: error?.message || String(error),
      });
    }
  });

  console.log('✓ v3 bundled data routes registered');
}
