/**
 * React Hook for Representative Searches
 * Uses Represent API only for postal code, name, and coordinate searches
 */

import { useState } from 'react';
import type { Representative } from '@shared/types';

interface SearchState {
  loading: boolean;
  error: string | null;
}

/**
 * Hook to search representatives using Represent API
 * Supports postal code (via coordinates), name, and riding searches
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { searchRepresentatives, loading, error } = useDataLoader();
 *   const [results, setResults] = useState<Representative[]>([]);
 *
 *   const handleSearch = async (query: string) => {
 *     const searchResults = await searchRepresentatives(query, 'postal_code');
 *     setResults(searchResults);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => handleSearch('K1A 0A6')}>Search Ottawa</button>
 *       {results.map(mp => (
 *         <div key={mp.id}>{mp.name} - {mp.constituency}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDataLoader() {
  const [state, setState] = useState<SearchState>({
    loading: false,
    error: null,
  });

  /**
   * Search representatives using Represent API
   */
  const searchRepresentatives = async (
    query: string,
    type: 'postal_code' | 'name' | 'riding' | 'coordinates',
    options?: { lat?: number; lng?: number; limit?: number }
  ): Promise<Representative[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`[useDataLoader] Searching representatives: ${type} - ${query || 'coordinates'}`);

      const requestBody: any = {
        type,
        limit: options?.limit || 20
      };

      if (type === 'coordinates') {
        if (!options?.lat || !options?.lng) {
          throw new Error('Latitude and longitude required for coordinate search');
        }
        requestBody.lat = options.lat;
        requestBody.lng = options.lng;
      } else if (query) {
        requestBody.query = query;
      }

      const response = await fetch('/api/representatives/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const representatives = data.representatives || [];

      console.log(`[useDataLoader] ✓ Found ${representatives.length} representatives`);
      setState({ loading: false, error: null });
      return representatives;

    } catch (error: any) {
      console.error('[useDataLoader] Search failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message || 'Search failed',
      }));
      return [];
    }
  };

  /**
   * Search by postal code (converted to coordinates internally)
   */
  const searchByPostalCode = async (postalCode: string): Promise<Representative[]> => {
    return searchRepresentatives(postalCode, 'postal_code');
  };

  /**
   * Search by representative name
   */
  const searchByName = async (name: string): Promise<Representative[]> => {
    return searchRepresentatives(name, 'name');
  };

  /**
   * Search by riding/electoral district
   */
  const searchByRiding = async (riding: string): Promise<Representative[]> => {
    return searchRepresentatives(riding, 'riding');
  };

  /**
   * Search by coordinates (most accurate)
   */
  const searchByCoordinates = async (lat: number, lng: number): Promise<Representative[]> => {
    return searchRepresentatives('', 'coordinates', { lat, lng });
  };

  return {
    searchRepresentatives,
    searchByPostalCode,
    searchByName,
    searchByRiding,
    searchByCoordinates,
    loading: state.loading,
    error: state.error,
  };
}

