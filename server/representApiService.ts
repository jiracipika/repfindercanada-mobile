/**
 * Comprehensive Represent API Service
 * Follows all best practices from https://represent.opennorth.ca/api/
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface Representative {
  name: string;
  first_name: string;
  last_name: string;
  gender?: string;
  district_name: string;
  elected_office: string;
  party_name: string;
  email?: string;
  photo_url?: string;
  url?: string;
  offices?: Array<{
    type: string;
    tel?: string;
    fax?: string;
    postal_address?: string;
  }>;
  related?: {
    boundary_set_url?: string;
    representative_set_url?: string;
  };
}

interface BoundarySet {
  url: string;
  name: string;
  domain: string;
  last_updated: string;
  source_url: string;
  count: number;
  related: {
    boundaries_url: string;
  };
}

interface Boundary {
  url: string;
  name: string;
  boundary_set_name: string;
  extent: [number, number, number, number]; // [min_lng, min_lat, max_lng, max_lat]
  shape_url?: string;
  simple_shape_url?: string;
  centroid?: Coordinates;
  related: {
    representatives_url?: string;
    boundary_set_url: string;
  };
}

interface RepresentativeSet {
  url: string;
  name: string;
  boundary_set_url: string;
  last_updated: string;
  source_url: string;
  related: {
    representatives_url: string;
  };
}

interface Election {
  url: string;
  name: string;
  election_date: string;
  election_type: string;
  data_url?: string;
  related: {
    candidates_url?: string;
  };
}

interface Candidate {
  url: string;
  name: string;
  first_name: string;
  last_name: string;
  gender?: string;
  district_name: string;
  party_name: string;
  email?: string;
  photo_url?: string;
  url?: string;
  elected_office?: string;
  election_name: string;
}

interface ApiResponse<T> {
  meta: {
    limit: number;
    offset: number;
    total_count: number;
    next?: string;
    previous?: string;
  };
  objects: T[];
}

/**
 * Main Represent API Client
 */
class RepresentApiClient {
  private readonly baseUrl = 'https://represent.opennorth.ca';
  private readonly userAgent = 'RepFinder/2.0 (+https://github.com/your-repo)';
  private rateLimitDelay = 1000; // 1 second between requests to respect rate limits
  private lastRequestTime = 0;

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    // Respect rate limiting (60 requests/minute = 1 request/second max)
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`[RepresentAPI] Requesting: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    if (!response.ok) {
      throw new Error(`Represent API error: ${response.status} ${response.statusText} for ${url}`);
    }

    const data = await response.json();
    this.lastRequestTime = Date.now();
    return data;
  }

  /**
   * POSTAL CODES
   * Note: API docs warn "Using postal codes is error prone"
   * For 100% accuracy, geocode addresses and use coordinates instead
   */
  async getPostalCodeRepresentatives(postalCode: string): Promise<ApiResponse<Representative>> {
    const cleanPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
    return this.makeRequest<ApiResponse<Representative>>(`/postcodes/${cleanPostalCode}/`);
  }

  /**
   * BOUNDARY SETS
   * Groups of electoral districts (BC provincial districts, Toronto wards, etc.)
   */
  async getBoundarySets(params: { name?: string; domain?: string; limit?: number; offset?: number } = {}): Promise<ApiResponse<BoundarySet>> {
    return this.makeRequest<ApiResponse<BoundarySet>>('/boundary-sets/', params);
  }

  async getBoundarySet(url: string): Promise<BoundarySet> {
    return this.makeRequest<BoundarySet>(new URL(url).pathname);
  }

  /**
   * BOUNDARIES
   * Individual electoral districts with geospatial data
   */
  async getBoundaries(boundarySetName: string, params: {
    name?: string;
    limit?: number;
    offset?: number;
    contains?: string; // lat,lng coordinates
    touches?: string; // boundary URL
    intersects?: string; // boundary URL
  } = {}): Promise<ApiResponse<Boundary>> {
    return this.makeRequest<ApiResponse<Boundary>>(`/boundaries/${boundarySetName}/`, params);
  }

  async getBoundary(url: string): Promise<Boundary> {
    return this.makeRequest<Boundary>(new URL(url).pathname);
  }

  async getBoundaryShape(url: string, format: 'geojson' | 'kml' | 'wkt' = 'geojson'): Promise<any> {
    const shapeUrl = url.replace(/\/$/, '') + '/shape/';
    return this.makeRequest(shapeUrl, { format });
  }

  async getBoundarySimpleShape(url: string): Promise<any> {
    const shapeUrl = url.replace(/\/$/, '') + '/simple_shape/';
    return this.makeRequest(shapeUrl);
  }

  async getBoundaryCentroid(url: string): Promise<Coordinates> {
    const centroidUrl = url.replace(/\/$/, '') + '/centroid/';
    return this.makeRequest<Coordinates>(centroidUrl);
  }

  /**
   * REPRESENTATIVE SETS
   * Collections of representatives for different offices/jurisdictions
   */
  async getRepresentativeSets(params: { name?: string; limit?: number; offset?: number } = {}): Promise<ApiResponse<RepresentativeSet>> {
    return this.makeRequest<ApiResponse<RepresentativeSet>>('/representative-sets/', params);
  }

  async getRepresentativeSet(url: string): Promise<RepresentativeSet> {
    return this.makeRequest<RepresentativeSet>(new URL(url).pathname);
  }

  /**
   * REPRESENTATIVES
   * Main endpoint for finding elected officials
   */
  async getRepresentatives(representativeSetName: string, params: {
    name?: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    district_name?: string;
    elected_office?: string;
    party_name?: string;
    point?: string; // lat,lng coordinates for location-based search
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Representative>> {
    return this.makeRequest<ApiResponse<Representative>>(`/representatives/${representativeSetName}/`, params);
  }

  async searchAllRepresentatives(params: {
    name?: string;
    first_name?: string;
    last_name__istartswith?: string; // Substring search
    district_name?: string;
    elected_office?: string;
    party_name?: string;
    point?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Representative>> {
    // Search across all representative sets (federal, provincial, municipal)
    const requests = [
      this.getRepresentatives('house-of-commons', params),
      this.getRepresentatives('ontario-legislature', params),
      this.getRepresentatives('toronto-city-council', params),
      // Add more representative sets as needed
    ];

    const results = await Promise.allSettled(requests);
    const allRepresentatives: Representative[] = [];
    let totalCount = 0;

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allRepresentatives.push(...result.value.objects);
        totalCount += result.value.meta.total_count;
      }
    });

    return {
      meta: {
        limit: params.limit || 20,
        offset: params.offset || 0,
        total_count: totalCount,
      },
      objects: allRepresentatives,
    };
  }

  /**
   * ELECTIONS
   * Election data and candidate information
   */
  async getElections(params: { name?: string; limit?: number; offset?: number } = {}): Promise<ApiResponse<Election>> {
    return this.makeRequest<ApiResponse<Election>>('/elections/', params);
  }

  async getElection(url: string): Promise<Election> {
    return this.makeRequest<Election>(new URL(url).pathname);
  }

  /**
   * CANDIDATES
   * Election candidates
   */
  async getCandidates(electionUrl: string, params: {
    name?: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    district_name?: string;
    party_name?: string;
    elected_office?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<Candidate>> {
    const electionPath = new URL(electionUrl).pathname;
    const candidatesPath = electionPath.replace(/\/$/, '') + '/candidates/';
    return this.makeRequest<ApiResponse<Candidate>>(candidatesPath, params);
  }

  /**
   * GEOSPATIAL QUERIES
   * Find boundaries by coordinates
   */
  async findBoundariesByCoordinates(lat: number, lng: number, boundarySetName?: string): Promise<Boundary[]> {
    const point = `${lat},${lng}`;

    if (boundarySetName) {
      const response = await this.getBoundaries(boundarySetName, { contains: point, limit: 1000 });
      return response.objects;
    } else {
      // Search all boundary sets
      const boundarySets = await this.getBoundarySets({ limit: 100 });
      const searchPromises = boundarySets.objects.map(async (set) => {
        try {
          const response = await this.getBoundaries(set.name.replace(/\/$/, ''), { contains: point, limit: 100 });
          return response.objects;
        } catch (error) {
          console.warn(`Failed to search boundary set ${set.name}:`, error);
          return [];
        }
      });

      const results = await Promise.all(searchPromises);
      return results.flat();
    }
  }

  async findRepresentativesByCoordinates(lat: number, lng: number): Promise<Representative[]> {
    const point = `${lat},${lng}`;

    // Use the federal representatives endpoint with point parameter
    const response = await this.getRepresentatives('house-of-commons', {
      point,
      elected_office: 'MP',
      limit: 100
    });

    return response.objects.filter(rep => rep.elected_office === 'MP');
  }

  /**
   * BULK DOWNLOADS
   * For large datasets, use limit=1000 and paginate
   */
  async getAllRepresentativesBulk(representativeSetName: string): Promise<Representative[]> {
    const allRepresentatives: Representative[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getRepresentatives(representativeSetName, { limit, offset });
      allRepresentatives.push(...response.objects);

      hasMore = !!response.meta.next;
      offset += limit;

      if (hasMore) {
        console.log(`Fetched ${allRepresentatives.length} representatives so far...`);
      }
    }

    return allRepresentatives;
  }

  async getAllBoundariesBulk(boundarySetName: string): Promise<Boundary[]> {
    const allBoundaries: Boundary[] = [];
    let offset = 0;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getBoundaries(boundarySetName, { limit, offset });
      allBoundaries.push(...response.objects);

      hasMore = !!response.meta.next;
      offset += limit;

      if (hasMore) {
        console.log(`Fetched ${allBoundaries.length} boundaries so far...`);
      }
    }

    return allBoundaries;
  }
}

export const representApi = new RepresentApiClient();
export type {
  Coordinates,
  Representative,
  BoundarySet,
  Boundary,
  RepresentativeSet,
  Election,
  Candidate,
  ApiResponse,
};