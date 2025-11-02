/**
 * React Hook for Loading Federal MP Data
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
   * Load MP data from Represent API
   */
  const load = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
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
export function useSearchMPs(searchQuery: string, allMPs: FederalMP[]) {
  const [results, setResults] = useState<FederalMP[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allMPs.filter(mp =>
      mp.name.toLowerCase().includes(query) ||
      mp.riding.toLowerCase().includes(query) ||
      mp.party.toLowerCase().includes(query)
    );

    setResults(filtered);
  }, [searchQuery, allMPs]);

  return results;
}
