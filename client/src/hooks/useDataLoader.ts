/**
 * React Hook for Loading Federal MP Data
<<<<<<< HEAD
 * Uses HYBRID approach: OpenParliament (primary) + Represent API (secondary)
 */

import { useState, useEffect } from 'react';
import {
  fetchHouseOfCommonsMPs,
  getDataQualityStats,
  type FederalMP,
} from '@/lib/data-sources/federalDataSource';

interface DataQualityStats {
  total: number;
  fromOpenParliament: number;
  enrichedWithRepresent: number;
  withContactInfo: number;
  withOfficeInfo: number;
  completionRate: number;
}

interface DataLoaderState {
  mps: FederalMP[];
=======
 * Uses Represent API only approach with enhanced best practices
 */

import { useState, useEffect } from 'react';
import type { Representative } from '@shared/types';

interface DataQualityStats {
  total: number;
  source: string;
  confidence: string;
  lastUpdated: string;
  totalRecords: number;
}

interface DataLoaderState {
  mps: Representative[];
>>>>>>> parent of 216aa7f (fixes)
  loading: boolean;
  error: string | null;
  loadedAt: Date | null;
  dataQuality: DataQualityStats | null;
}

interface UseDataLoaderOptions {
  autoLoad?: boolean; // Auto-load on mount (default: true)
  staleTime?: number; // Consider data stale after this many ms (default: 24 hours)
}

/**
 * Hook to load and cache federal MP data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mps, loading, error, reload } = useDataLoader();
 *
 *   if (loading) return <div>Loading MPs...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *
 *   return (
 *     <div>
 *       <h2>Found {mps.length} MPs</h2>
 *       <button onClick={reload}>Refresh</button>
 *       {mps.map(mp => (
 *         <div key={mp.id}>{mp.name} - {mp.party}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useDataLoader(options: UseDataLoaderOptions = {}) {
  const { autoLoad = true, staleTime = 24 * 60 * 60 * 1000 } = options;

  const [state, setState] = useState<DataLoaderState>({
    mps: [],
    loading: false,
    error: null,
    loadedAt: null,
    dataQuality: null,
  });

  /**
<<<<<<< HEAD
   * Load MP data from Represent API
=======
   * Load MP data from enhanced Represent API
>>>>>>> parent of 216aa7f (fixes)
   */
  const load = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
<<<<<<< HEAD
      console.log('[useDataLoader] Starting hybrid MP data load...');
      console.log('[useDataLoader] Primary: OpenParliament API');
      console.log('[useDataLoader] Secondary: Represent API (for missing data)');

      const mps = await fetchHouseOfCommonsMPs();

      // Calculate data quality statistics
      const qualityStats = await getDataQualityStats(mps);

      setState({
        mps,
        loading: false,
        error: null,
        loadedAt: new Date(),
        dataQuality: qualityStats,
      });

      console.log(`[useDataLoader] ✓ Loaded ${mps.length} MPs successfully`);
      console.log(`[useDataLoader] Data Quality:`);
      console.log(`  - OpenParliament only: ${qualityStats.fromOpenParliament}`);
      console.log(`  - Enriched with Represent: ${qualityStats.enrichedWithRepresent}`);
      console.log(`  - With contact info: ${qualityStats.withContactInfo}`);
      console.log(`  - With office info: ${qualityStats.withOfficeInfo}`);
      console.log(`  - Completion rate: ${qualityStats.completionRate.toFixed(1)}%`);
=======
      console.log('[useDataLoader] Starting enhanced Represent API data load...');
      console.log('[useDataLoader] Using Represent API with best practices');

      // Use the enhanced search endpoint to get all federal MPs
      const response = await fetch('/api/representatives/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: '',
          type: 'name',
          limit: 1000 // Get a large sample
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const mps = data.representatives || [];

      // Get data quality stats from the API response
      const qualityStats: DataQualityStats = {
        total: mps.length,
        source: data.dataSource || 'represent_api_enhanced',
        confidence: data.confidence || 'medium',
        lastUpdated: new Date().toISOString(),
        totalRecords: mps.length
      };

      setState({
        mps,
        loading: false,
        error: null,
        loadedAt: new Date(),
        dataQuality: qualityStats,
      });

      console.log(`[useDataLoader] ✓ Loaded ${mps.length} MPs successfully`);
      console.log(`[useDataLoader] Data Quality:`);
      console.log(`  - Source: ${qualityStats.source}`);
      console.log(`  - Confidence: ${qualityStats.confidence}`);
      console.log(`  - Total records: ${qualityStats.totalRecords}`);
>>>>>>> parent of 216aa7f (fixes)

    } catch (error: any) {
      console.error('[useDataLoader] Failed to load MP data:', error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message || 'Failed to load MP data',
      }));
    }
  };

  /**
   * Check if data is stale and needs refresh
   */
  const isStale = () => {
    if (!state.loadedAt) return true;
    const age = Date.now() - state.loadedAt.getTime();
    return age > staleTime;
  };

  /**
   * Force reload data
   */
  const reload = () => {
    console.log('[useDataLoader] Manual reload requested');
    load();
  };

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && state.mps.length === 0 && !state.loading) {
      load();
    }
  }, [autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    mps: state.mps,
    loading: state.loading,
    error: state.error,
    loadedAt: state.loadedAt,
    isStale: isStale(),
    reload,
    dataQuality: state.dataQuality,
  };
}

/**
 * Search MPs by name (local filtering)
 */
<<<<<<< HEAD
export function useSearchMPs(searchQuery: string, allMPs: FederalMP[]) {
  const [results, setResults] = useState<FederalMP[]>([]);
=======
export function useSearchMPs(searchQuery: string, allMPs: Representative[]) {
  const [results, setResults] = useState<Representative[]>([]);
>>>>>>> parent of 216aa7f (fixes)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allMPs.filter(mp =>
      mp.name.toLowerCase().includes(query) ||
<<<<<<< HEAD
      mp.riding.toLowerCase().includes(query) ||
=======
      mp.constituency.toLowerCase().includes(query) ||
>>>>>>> parent of 216aa7f (fixes)
      mp.party.toLowerCase().includes(query)
    );

    setResults(filtered);
  }, [searchQuery, allMPs]);

  return results;
}
