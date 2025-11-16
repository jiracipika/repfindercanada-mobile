import { Preferences } from "@capacitor/preferences";
import { App as CapApp } from "@capacitor/app";

/**
 * Version-based cache management
 * - For versions < 3.0: Clear all previous cache
 * - For versions >= 3.0: Preserve cache
 */

const CACHE_VERSION_KEY = 'cache_version_processed';
const CURRENT_CACHE_VERSION = '3.0.0';

/**
 * Compare two version strings
 * Returns:
 *   -1 if versionA < versionB
 *    0 if versionA === versionB
 *    1 if versionA > versionB
 */
function compareVersions(versionA: string, versionB: string): number {
  const aParts = versionA.split('.').map(n => parseInt(n, 10) || 0);
  const bParts = versionB.split('.').map(n => parseInt(n, 10) || 0);

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;

    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
  }

  return 0;
}

/**
 * Check if we should clear cache based on version
 * Rules:
 * - Versions < 3.0: Clear cache
 * - Version 3.0.0: Clear cache
 * - Versions > 3.0.0: Preserve cache
 */
async function shouldClearCache(currentVersion: string): Promise<boolean> {
  try {
    // Get the last processed cache version
    const { value: lastProcessedVersion } = await Preferences.get({
      key: CACHE_VERSION_KEY
    });

    console.log(`[CacheManager] Current version: ${currentVersion}, Last processed: ${lastProcessedVersion || 'none'}`);

    // If we've never processed cache version before, check if we should clear
    if (!lastProcessedVersion) {
      // For fresh installs with version < 3.0, we need to clear any existing cache
      if (compareVersions(currentVersion, '3.0.0') < 0) {
        console.log(`[CacheManager] Version ${currentVersion} < 3.0.0, clearing any existing cache`);
        return true;
      }
      // Version exactly 3.0.0 should clear cache
      if (compareVersions(currentVersion, '3.0.0') === 0) {
        console.log(`[CacheManager] Version ${currentVersion} === 3.0.0, clearing cache`);
        return true;
      }
      // Versions > 3.0.0 should preserve cache
      console.log(`[CacheManager] Version ${currentVersion} > 3.0.0, preserving existing cache`);
      return false;
    }

    // If we've processed this version before, don't clear
    if (lastProcessedVersion === currentVersion) {
      console.log(`[CacheManager] Version ${currentVersion} already processed, no cache clearing needed`);
      return false;
    }

    // If upgrading from < 3.0 to exactly 3.0.0, clear cache
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') === 0) {
      console.log(`[CacheManager] Upgrading from ${lastProcessedVersion} to exactly 3.0.0, clearing cache`);
      return true;
    }

    // If upgrading from < 3.0 to > 3.0.0, preserve cache (skipping 3.0.0)
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') > 0) {
      console.log(`[CacheManager] Upgrading from ${lastProcessedVersion} to ${currentVersion} > 3.0.0, preserving cache`);
      return false;
    }

    // If current version is exactly 3.0.0, clear cache (regardless of previous version)
    if (compareVersions(currentVersion, '3.0.0') === 0) {
      console.log(`[CacheManager] Current version is exactly 3.0.0, clearing cache`);
      return true;
    }

    // For version changes where both are > 3.0.0, preserve cache
    if (compareVersions(lastProcessedVersion, '3.0.0') > 0 &&
        compareVersions(currentVersion, '3.0.0') > 0) {
      console.log(`[CacheManager] Version change from ${lastProcessedVersion} to ${currentVersion} (both > 3.0.0), preserving cache`);
      return false;
    }

    // For version changes where both are < 3.0.0, clear cache
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') < 0) {
      console.log(`[CacheManager] Version change from ${lastProcessedVersion} to ${currentVersion} (both < 3.0.0), clearing cache`);
      return true;
    }

    // Default: preserve cache
    console.log(`[CacheManager] Default case for ${lastProcessedVersion} to ${currentVersion}, preserving cache`);
    return false;

  } catch (error) {
    console.error('[CacheManager] Error checking cache version:', error);
    // On error, be conservative and don't clear cache for newer versions
    return false;
  }
}

/**
 * Clear all caches including service worker cache, search cache, and localStorage
 */
async function clearAllCaches(): Promise<void> {
  console.log('[CacheManager] === Clearing All Caches ===');

  try {
    // 1. Clear React Query cache (if accessible)
    try {
      // Clear query client cache if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const queryKeys = keys.filter(key => key.startsWith('react-query'));
        queryKeys.forEach(key => localStorage.removeItem(key));
        console.log(`[CacheManager] Cleared ${queryKeys.length} React Query cache entries`);
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing React Query cache:', error);
    }

    // 2. Clear any remaining search-related caches (House of Commons functionality moved to R search)
    try {
      // R search doesn't use any cache anymore - all searches are live API calls
      console.log('[CacheManager] R search does not use cache - all searches are live API calls');
    } catch (error) {
      console.warn('[CacheManager] Note on R search cache clearing:', error);
    }

    // 4. Clear any localStorage caches
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(key =>
          key.includes('cache') ||
          key.includes('search') ||
          key.includes('commons') ||
          key.includes('representatives')
        );
        cacheKeys.forEach(key => localStorage.removeItem(key));
        console.log(`[CacheManager] Cleared ${cacheKeys.length} localStorage cache entries`);
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing localStorage caches:', error);
    }

    // 5. Clear Preferences caches
    try {
      const { keys } = await Preferences.keys();
      const cacheKeys = keys.filter(key =>
        key.includes('cache') ||
        key.includes('search') ||
        key.includes('cached')
      );

      for (const key of cacheKeys) {
        await Preferences.remove({ key });
      }
      console.log(`[CacheManager] Cleared ${cacheKeys.length} Preferences cache entries`);
    } catch (error) {
      console.warn('[CacheManager] Error clearing Preferences caches:', error);
    }

    // 6. Clear service worker cache if available
    try {
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        const targetCaches = cacheNames.filter(name =>
          name.includes('find-my-rep') ||
          name.includes('cache') ||
          name.includes('workbox')
        );

        await Promise.all(
          targetCaches.map(cacheName => caches.delete(cacheName))
        );
        console.log(`[CacheManager] Cleared ${targetCaches.length} service worker caches`);
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing service worker caches:', error);
    }

    console.log('[CacheManager] === All Caches Cleared Successfully ===');

  } catch (error) {
    console.error('[CacheManager] Error during cache clearing:', error);
    throw error;
  }
}

/**
 * Mark current version as processed
 */
async function markVersionAsProcessed(version: string): Promise<void> {
  try {
    await Preferences.set({
      key: CACHE_VERSION_KEY,
      value: version
    });
    console.log(`[CacheManager] Marked version ${version} as processed`);
  } catch (error) {
    console.error('[CacheManager] Error marking version as processed:', error);
  }
}

/**
 * Initialize cache management based on app version
 * This should be called during app startup
 */
export async function initializeCacheManagement(): Promise<void> {
  try {
    console.log('[CacheManager] === Initializing Version-Based Cache Management ===');

    // Get current app version
    const appInfo = await CapApp.getInfo();
    const currentVersion = appInfo.version ?? '0.0.0';

    console.log(`[CacheManager] App version: ${currentVersion}`);

    // Check if we should clear cache
    const shouldClear = await shouldClearCache(currentVersion);

    if (shouldClear) {
      console.log(`[CacheManager] Clearing cache for version ${currentVersion}`);
      await clearAllCaches();
    } else {
      console.log(`[CacheManager] Preserving cache for version ${currentVersion}`);
    }

    // Mark this version as processed
    await markVersionAsProcessed(currentVersion);

    console.log('[CacheManager] === Cache Management Initialization Complete ===');

  } catch (error) {
    console.error('[CacheManager] Error initializing cache management:', error);
    // Don't throw error to prevent app startup failure
  }
}

/**
 * Force clear all caches regardless of version
 * Useful for testing or manual cache clearing
 */
export async function forceClearAllCaches(): Promise<void> {
  console.log('[CacheManager] Force clearing all caches');
  await clearAllCaches();
}

/**
 * Get cache management status
 */
export async function getCacheManagementStatus(): Promise<{
  currentVersion: string;
  lastProcessedVersion: string | null;
  shouldPreserveCache: boolean;
}> {
  try {
    const appInfo = await CapApp.getInfo();
    const currentVersion = appInfo.version ?? '0.0.0';
    const { value: lastProcessedVersion } = await Preferences.get({
      key: CACHE_VERSION_KEY
    });

    // Determine if cache should be preserved (version > 3.0.0, NOT >=)
    const shouldPreserveCache = compareVersions(currentVersion, '3.0.0') > 0;

    return {
      currentVersion,
      lastProcessedVersion,
      shouldPreserveCache
    };
  } catch (error) {
    console.error('[CacheManager] Error getting cache status:', error);
    return {
      currentVersion: '0.0.0',
      lastProcessedVersion: null,
      shouldPreserveCache: false
    };
  }
}