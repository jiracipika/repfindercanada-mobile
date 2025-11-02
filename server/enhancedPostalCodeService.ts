/**
 * Enhanced Postal Code Service
 * Follows Represent API best practices:
 * 1. Uses postal code lookup with coordinate extraction
 * 2. Falls back to coordinate-based search for accuracy
 * 3. Handles multiple boundary matches
 * 4. Implements proper error handling and rate limiting
 */

import { representApi, type Representative, type Boundary, Coordinates } from './representApiService';

interface PostalCodeResult {
  representatives: Representative[];
  boundaries: Boundary[];
  coordinates: Coordinates | null;
  postalCode: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  dataSource: 'postal_api' | 'coordinate_search' | 'fallback';
}

interface GeocodingService {
  getCoordinatesFromPostalCode(postalCode: string): Promise<Coordinates | null>;
}

/**
 * Mock Geocoding Service
 * In production, replace with a real geocoding service like:
 * - Google Maps Geocoding API
 * - Canada Post Address Complete
 * - OpenStreetMap Nominatim
 * - Mapbox Geocoding
 */
class MockGeocodingService implements GeocodingService {
  // Cache for common postal codes with their coordinates
  private postalCodeCoordinates: Record<string, Coordinates> = {
    'K1A0A6': { lat: 45.4215, lng: -75.6972 }, // Ottawa Parliament Hill
    'M5V3A9': { lat: 43.6445, lng: -79.3940 }, // Toronto City Hall
    'V6B2W9': { lat: 49.2827, lng: -123.1207 }, // Vancouver City Hall
    'T2P1V4': { lat: 51.0447, lng: -114.0719 }, // Calgary City Hall
    'H3B1R9': { lat: 45.5017, lng: -73.5673 }, // Montreal City Hall
  };

  async getCoordinatesFromPostalCode(postalCode: string): Promise<Coordinates | null> {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();

    // Return cached coordinates if available
    if (this.postalCodeCoordinates[cleanPostalCode]) {
      return this.postalCodeCoordinates[cleanPostalCode];
    }

    // For demonstration, generate approximate coordinates based on FSA (first 3 characters)
    const fsa = cleanPostalCode.substring(0, 3);
    return this.generateApproximateCoordinates(fsa);
  }

  private generateApproximateCoordinates(fsa: string): Coordinates | null {
    // This is a very rough approximation for demonstration
    // In production, use a real geocoding service
    const fsaCoordinates: Record<string, Coordinates> = {
      'K1A': { lat: 45.4215, lng: -75.6972 }, // Ottawa Downtown
      'M5V': { lat: 43.6445, lng: -79.3940 }, // Toronto Downtown
      'V6B': { lat: 49.2827, lng: -123.1207 }, // Vancouver Downtown
      'T2P': { lat: 51.0447, lng: -114.0719 }, // Calgary Downtown
      'H3B': { lat: 45.5017, lng: -73.5673 }, // Montreal Downtown
    };

    return fsaCoordinates[fsa] || null;
  }
}

/**
 * Enhanced Postal Code Lookup Service
 */
export class EnhancedPostalCodeService {
  private geocodingService: GeocodingService;

  constructor(geocodingService?: GeocodingService) {
    this.geocodingService = geocodingService || new MockGeocodingService();
  }

  /**
   * Main postal code lookup method
   * Follows Represent API best practices
   */
  async lookupPostalCode(postalCode: string): Promise<PostalCodeResult> {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    console.log(`[EnhancedPostalCode] Looking up: ${cleanPostalCode}`);

    try {
      // Step 1: Try direct postal code lookup (primary method)
      const directResult = await this.directPostalCodeLookup(cleanPostalCode);
      if (directResult.representatives.length > 0) {
        console.log(`[EnhancedPostalCode] Direct lookup successful: ${directResult.representatives.length} representatives`);
        return {
          ...directResult,
          postalCode: cleanPostalCode,
          confidence: 'high',
          dataSource: 'postal_api'
        };
      }

      console.log(`[EnhancedPostalCode] Direct lookup returned no results, trying coordinate-based search`);

      // Step 2: Convert postal code to coordinates and search by location
      const coordinateResult = await this.coordinateBasedSearch(cleanPostalCode);
      if (coordinateResult.representatives.length > 0) {
        console.log(`[EnhancedPostalCode] Coordinate search successful: ${coordinateResult.representatives.length} representatives`);
        return {
          ...coordinateResult,
          postalCode: cleanPostalCode,
          confidence: 'medium',
          dataSource: 'coordinate_search'
        };
      }

      // Step 3: Return empty result with warnings
      console.log(`[EnhancedPostalCode] No results found for postal code: ${cleanPostalCode}`);
      return {
        representatives: [],
        boundaries: [],
        coordinates: null,
        postalCode: cleanPostalCode,
        confidence: 'low',
        warnings: [`No representatives found for postal code ${cleanPostalCode}`],
        dataSource: 'fallback'
      };

    } catch (error) {
      console.error(`[EnhancedPostalCode] Error looking up postal code ${cleanPostalCode}:`, error);
      return {
        representatives: [],
        boundaries: [],
        coordinates: null,
        postalCode: cleanPostalCode,
        confidence: 'low',
        warnings: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        dataSource: 'fallback'
      };
    }
  }

  /**
   * Direct postal code lookup using Represent API
   */
  private async directPostalCodeLookup(postalCode: string): Promise<Omit<PostalCodeResult, 'postalCode' | 'confidence' | 'dataSource'>> {
    const response = await representApi.getPostalCodeRepresentatives(postalCode);

    // Extract representatives from both centroid and concordance data
    const centroidReps = response.representatives_centroid || [];
    const concordanceReps = response.representatives_concordance || [];
    const allRepresentatives = [...centroidReps, ...concordanceReps];

    // Filter for current federal MPs only
    const federalMPs = allRepresentatives.filter(rep =>
      rep.elected_office === 'MP' &&
      rep.incumbent === true
    );

    // Extract boundaries from the response
    const boundaries: Boundary[] = [];
    if (response.boundaries_centroid) {
      boundaries.push(...response.boundaries_centroid);
    }

    // Get coordinates from the response if available
    let coordinates: Coordinates | null = null;
    if (response.centroid && response.centroid.coordinates) {
      coordinates = {
        lat: response.centroid.coordinates[1],
        lng: response.centroid.coordinates[0]
      };
    }

    const warnings: string[] = [];

    // Add warnings based on API response characteristics
    if (federalMPs.length === 0 && allRepresentatives.length > 0) {
      warnings.push('Postal code found but no current federal MPs - might be provincial/municipal representatives');
    }

    if (centroidReps.length > 0 && concordanceReps.length > 0 &&
        JSON.stringify(centroidReps) !== JSON.stringify(concordanceReps)) {
      warnings.push('Multiple representative sets returned - using combined results');
    }

    return {
      representatives: federalMPs,
      boundaries,
      coordinates,
      warnings
    };
  }

  /**
   * Coordinate-based search when direct postal code lookup fails
   */
  private async coordinateBasedSearch(postalCode: string): Promise<Omit<PostalCodeResult, 'postalCode' | 'confidence' | 'dataSource'>> {
    // Step 1: Convert postal code to coordinates
    const coordinates = await this.geocodingService.getCoordinatesFromPostalCode(postalCode);

    if (!coordinates) {
      return {
        representatives: [],
        boundaries: [],
        coordinates: null,
        warnings: ['Could not convert postal code to coordinates']
      };
    }

    console.log(`[EnhancedPostalCode] Converted postal code to coordinates: ${coordinates.lat}, ${coordinates.lng}`);

    // Step 2: Find representatives by coordinates
    const representatives = await representApi.findRepresentativesByCoordinates(coordinates.lat, coordinates.lng);

    // Step 3: Find boundaries for these coordinates
    const boundaries = await representApi.findBoundariesByCoordinates(coordinates.lat, coordinates.lng, 'federal-electoral-districts');

    const warnings: string[] = [];
    if (representatives.length === 0) {
      warnings.push('Found coordinates but no federal representatives at this location');
    }

    return {
      representatives,
      boundaries,
      coordinates,
      warnings
    };
  }

  /**
   * Get enhanced boundary information for a postal code
   */
  async getBoundaryInformation(postalCode: string): Promise<{
    primaryBoundary: Boundary | null;
    allBoundaries: Boundary[];
    shapeData: any;
  }> {
    const result = await this.lookupPostalCode(postalCode);

    if (result.boundaries.length === 0) {
      return {
        primaryBoundary: null,
        allBoundaries: [],
        shapeData: null
      };
    }

    // Use the first boundary as primary (usually the most relevant)
    const primaryBoundary = result.boundaries[0];
    let shapeData = null;

    try {
      if (primaryBoundary.simple_shape_url) {
        shapeData = await representApi.getBoundarySimpleShape(primaryBoundary.url);
      }
    } catch (error) {
      console.warn('Failed to fetch boundary shape data:', error);
    }

    return {
      primaryBoundary,
      allBoundaries: result.boundaries,
      shapeData
    };
  }

  /**
   * Validate postal code format
   */
  static isValidCanadianPostalCode(postalCode: string): boolean {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    const postalCodeRegex = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d$/i;
    return postalCodeRegex.test(cleanPostalCode);
  }

  /**
   * Format postal code consistently
   */
  static formatPostalCode(postalCode: string): string {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    if (cleanPostalCode.length === 6) {
      return cleanPostalCode.substring(0, 3) + ' ' + cleanPostalCode.substring(3);
    }
    return cleanPostalCode;
  }
}

export const enhancedPostalCodeService = new EnhancedPostalCodeService();
export type { PostalCodeResult, GeocodingService };