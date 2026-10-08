import { Preferences } from "@capacitor/preferences";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { APP_VERSION } from "../version";

/**
 * Version-based cache management
 * - For versions < 3.0: Clear all previous cache
 * - For versions >= 3.0: Preserve cache
 */

const CACHE_VERSION_KEY = 'cache_version_processed';
const CURRENT_CACHE_VERSION = APP_VERSION;

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


    // If we've never processed cache version before, check if we should clear
    if (!lastProcessedVersion) {
      // For fresh installs with version < 3.0, we need to clear any existing cache
      if (compareVersions(currentVersion, '3.0.0') < 0) {
        return true;
      }
      // Version exactly 3.0.0 should clear cache
      if (compareVersions(currentVersion, '3.0.0') === 0) {
        return true;
      }
      // Versions > 3.0.0 should preserve cache
      return false;
    }

    // If we've processed this version before, don't clear
    if (lastProcessedVersion === currentVersion) {
      return false;
    }

    // If upgrading from < 3.0 to exactly 3.0.0, clear cache
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') === 0) {
      return true;
    }

    // If upgrading from < 3.0 to > 3.0.0, preserve cache (skipping 3.0.0)
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') > 0) {
      return false;
    }

    // If current version is exactly 3.0.0, clear cache (regardless of previous version)
    if (compareVersions(currentVersion, '3.0.0') === 0) {
      return true;
    }

    // For version changes where both are > 3.0.0, preserve cache
    if (compareVersions(lastProcessedVersion, '3.0.0') > 0 &&
        compareVersions(currentVersion, '3.0.0') > 0) {
      return false;
    }

    // For version changes where both are < 3.0.0, clear cache
    if (compareVersions(lastProcessedVersion, '3.0.0') < 0 &&
        compareVersions(currentVersion, '3.0.0') < 0) {
      return true;
    }

    // Default: preserve cache
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
  try {
    // 1. Clear React Query cache (if accessible)
    try {
      // Clear query client cache if available
      if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const queryKeys = keys.filter(key => key.startsWith('react-query'));
        queryKeys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing React Query cache:', error);
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
      }
    } catch (error) {
      console.warn('[CacheManager] Error clearing service worker caches:', error);
    }

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
    // Get current app version
    const appInfo = await CapApp.getInfo();
    const currentVersion = appInfo.version ?? '0.0.0';

    // Check if we should clear cache
    const shouldClear = await shouldClearCache(currentVersion);

    if (shouldClear) {
      await clearAllCaches();
    }

    // Mark this version as processed
    await markVersionAsProcessed(currentVersion);


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
    // Capacitor App.getInfo is native-only; on web it throws and the catch
    // below would report "0.0.0" to the Profile page. Mirror App.tsx and fall
    // back to the package version on web.
    const currentVersion = Capacitor.isNativePlatform()
      ? (await CapApp.getInfo()).version ?? APP_VERSION
      : APP_VERSION;
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