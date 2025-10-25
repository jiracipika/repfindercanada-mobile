/**
 * React Hook for Data Loader
 * Manages loading representative data on app startup
 */

import { useState, useEffect, useCallback } from 'react';
import {
  loadAllRepresentativeData,
  forceRefreshAllData,
  getDataStats,
  type DataLoadProgress,
} from '@/lib/data-loader';

interface UseDataLoaderReturn {
  isLoading: boolean;
  isComplete: boolean;
  error: Error | null;
  progress: DataLoadProgress | null;
  stats: {
    federal: { count: number; lastUpdated: string | null };
    provincial: { count: number; lastUpdated: string | null };
    municipal: { count: number; lastUpdated: string | null };
  } | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to load representative data on app startup
 * Automatically loads data when component mounts
 */
export function useDataLoader(autoLoad = true): UseDataLoaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<DataLoadProgress | null>(null);
  const [stats, setStats] = useState<UseDataLoaderReturn['stats']>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsComplete(false);

      console.log('[useDataLoader] Starting data load...');

      await loadAllRepresentativeData((progress) => {
        setProgress(progress);
      });

      // Load stats after data is loaded
      const dataStats = await getDataStats();
      setStats(dataStats);

      setIsComplete(true);
      console.log('[useDataLoader] Data load complete');
    } catch (err) {
      console.error('[useDataLoader] Data load failed:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useDataLoader] Force refreshing data...');

      await forceRefreshAllData((progress) => {
        setProgress(progress);
      });

      // Load stats after refresh
      const dataStats = await getDataStats();
      setStats(dataStats);

      setIsComplete(true);
      console.log('[useDataLoader] Force refresh complete');
    } catch (err) {
      console.error('[useDataLoader] Force refresh failed:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadData();
    }
  }, [autoLoad, loadData]);

  return {
    isLoading,
    isComplete,
    error,
    progress,
    stats,
    refresh,
  };
}
