/**
 * Master Data Loader
 * Fetches and caches representative data from all government sources on app launch
 */

import { fetchHouseOfCommonsMPs } from './data-sources/federalDataSource';
import { fetchAllProvincialReps } from './data-sources/provincialDataSource';
import { fetchMunicipalReps } from './data-sources/municipalDataSource';
import {
  saveFederalMPs,
  saveProvincialReps,
  saveMunicipalReps,
  getAllFederalMPs,
  getAllProvincialReps,
  getAllMunicipalReps,
  needsDataRefresh,
  searchFederalMPsByRiding,
  searchFederalMPsByName,
} from './storage/representativeDatabase';

export interface DataLoadProgress {
  stage: 'federal' | 'provincial' | 'municipal' | 'complete';
  loaded: number;
  total: number;
  status: string;
}

type ProgressCallback = (progress: DataLoadProgress) => void;

/**
 * Load all representative data
 * Fetches from government sources and caches in IndexedDB
 */
export async function loadAllRepresentativeData(
  onProgress?: ProgressCallback
): Promise<void> {
  console.log('[DataLoader] Starting data load...');

  try {
    // Stage 1: Federal MPs
    onProgress?.({
      stage: 'federal',
      loaded: 0,
      total: 3,
      status: 'Fetching federal MPs from House of Commons...',
    });

    const federalNeedsRefresh = await needsDataRefresh('federal');

    if (federalNeedsRefresh) {
      console.log('[DataLoader] Fetching fresh federal MP data...');
      const federalMPs = await fetchHouseOfCommonsMPs();
      await saveFederalMPs(federalMPs);
      console.log(`[DataLoader] ✓ Loaded ${federalMPs.length} federal MPs`);
    } else {
      console.log('[DataLoader] Using cached federal MP data (< 24hrs old)');
    }

    // Stage 2: Provincial Reps (optional for now)
    onProgress?.({
      stage: 'provincial',
      loaded: 1,
      total: 3,
      status: 'Fetching provincial representatives...',
    });

    const provincialNeedsRefresh = await needsDataRefresh('provincial');

    if (provincialNeedsRefresh) {
      console.log('[DataLoader] Fetching provincial representative data...');
      try {
        const provincialReps = await fetchAllProvincialReps();
        if (provincialReps.length > 0) {
          await saveProvincialReps(provincialReps);
          console.log(`[DataLoader] ✓ Loaded ${provincialReps.length} provincial reps`);
        } else {
          console.log('[DataLoader] No provincial data available yet');
        }
      } catch (error) {
        console.warn('[DataLoader] Provincial data fetch failed:', error);
        // Don't fail the whole load if provincial fails
      }
    } else {
      console.log('[DataLoader] Using cached provincial data (< 24hrs old)');
    }

    // Stage 3: Municipal Reps (optional for now)
    onProgress?.({
      stage: 'municipal',
      loaded: 2,
      total: 3,
      status: 'Fetching municipal representatives...',
    });

    const municipalNeedsRefresh = await needsDataRefresh('municipal');

    if (municipalNeedsRefresh) {
      console.log('[DataLoader] Fetching municipal representative data...');
      try {
        const municipalReps = await fetchMunicipalReps();
        if (municipalReps.length > 0) {
          await saveMunicipalReps(municipalReps);
          console.log(`[DataLoader] ✓ Loaded ${municipalReps.length} municipal reps`);
        } else {
          console.log('[DataLoader] No municipal data available yet');
        }
      } catch (error) {
        console.warn('[DataLoader] Municipal data fetch failed:', error);
        // Don't fail the whole load if municipal fails
      }
    } else {
      console.log('[DataLoader] Using cached municipal data (< 24hrs old)');
    }

    // Complete
    onProgress?.({
      stage: 'complete',
      loaded: 3,
      total: 3,
      status: 'Data load complete',
    });

    console.log('[DataLoader] ✓ All data loaded successfully');
  } catch (error) {
    console.error('[DataLoader] Data load failed:', error);
    throw error;
  }
}

/**
 * Search for representatives by riding name
 * Uses local IndexedDB data
 */
export async function searchByRiding(ridingName: string) {
  console.log(`[DataLoader] Searching for riding: ${ridingName}`);

  try {
    // Search federal MPs
    const federalResults = await searchFederalMPsByRiding(ridingName);

    // TODO: Search provincial and municipal when implemented

    return {
      federal: federalResults,
      provincial: [],
      municipal: [],
    };
  } catch (error) {
    console.error('[DataLoader] Search failed:', error);
    throw error;
  }
}

/**
 * Search for representatives by name
 * Uses local IndexedDB data
 */
export async function searchByName(name: string) {
  console.log(`[DataLoader] Searching for name: ${name}`);

  try {
    // Search federal MPs
    const federalResults = await searchFederalMPsByName(name);

    // TODO: Search provincial and municipal when implemented

    return {
      federal: federalResults,
      provincial: [],
      municipal: [],
    };
  } catch (error) {
    console.error('[DataLoader] Search failed:', error);
    throw error;
  }
}

/**
 * Get statistics about loaded data
 */
export async function getDataStats() {
  const [federalMPs, provincialReps, municipalReps] = await Promise.all([
    getAllFederalMPs(),
    getAllProvincialReps(),
    getAllMunicipalReps(),
  ]);

  return {
    federal: {
      count: federalMPs.length,
      lastUpdated: await getLastUpdated('federal'),
    },
    provincial: {
      count: provincialReps.length,
      lastUpdated: await getLastUpdated('provincial'),
    },
    municipal: {
      count: municipalReps.length,
      lastUpdated: await getLastUpdated('municipal'),
    },
  };
}

async function getLastUpdated(key: 'federal' | 'provincial' | 'municipal'): Promise<string | null> {
  const { getDataMetadata } = await import('./storage/representativeDatabase');
  const metadata = await getDataMetadata(key);
  return metadata?.lastUpdated || null;
}

/**
 * Force refresh all data (ignore cache)
 */
export async function forceRefreshAllData(onProgress?: ProgressCallback): Promise<void> {
  console.log('[DataLoader] Force refreshing all data...');

  // Clear cache first
  const { clearAllData } = await import('./storage/representativeDatabase');
  await clearAllData();

  // Load fresh data
  await loadAllRepresentativeData(onProgress);
}
