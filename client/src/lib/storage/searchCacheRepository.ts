import { Preferences } from "@capacitor/preferences";
import type { ApiRepresentative as Representative } from "@shared/schema";

const CACHE_KEY = "SEARCH_CACHE_R_V2";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedSearch {
  query: string;
  representatives: Representative[];
  timestamp: number;
}

interface SearchCache {
  [key: string]: CachedSearch;
}

/**
 * Normalize postal code for consistent cache keys
 */
const normalizePostalCode = (postalCode: string): string => {
  return postalCode.replace(/\s+/g, "").toUpperCase();
};

/**
 * Get all cached searches
 */
const getCache = async (): Promise<SearchCache> => {
  const { value } = await Preferences.get({ key: CACHE_KEY });
  if (!value) {
    return {};
  }

  try {
    const cache: SearchCache = JSON.parse(value);

    // Clean up expired entries
    const now = Date.now();
    const cleaned: SearchCache = {};

    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp < CACHE_EXPIRY_MS) {
        cleaned[key] = entry;
      }
    }

    // Save cleaned cache if we removed any entries
    if (Object.keys(cleaned).length !== Object.keys(cache).length) {
      await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(cleaned) });
    }

    return cleaned;
  } catch (error) {
    console.error("[searchCacheRepository] Error parsing cache:", error);
    return {};
  }
};

/**
 * Save the entire cache
 */
const saveCache = async (cache: SearchCache): Promise<void> => {
  await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(cache) });
};

export const searchCacheRepository = {
  /**
   * Cache search results for a postal code
   */
  cacheSearch: async (
    postalCode: string,
    representatives: Representative[]
  ): Promise<void> => {
    const normalizedPostal = normalizePostalCode(postalCode);
    const cache = await getCache();

    cache[normalizedPostal] = {
      query: postalCode,
      representatives,
      timestamp: Date.now(),
    };

    await saveCache(cache);
    console.log(
      `[searchCacheRepository] Cached ${representatives.length} representatives for postal code:`,
      normalizedPostal
    );
  },

  /**
   * Get cached search results for a postal code
   */
  getCachedSearch: async (
    postalCode: string
  ): Promise<Representative[] | null> => {
    const normalizedPostal = normalizePostalCode(postalCode);
    const cache = await getCache();

    const cached = cache[normalizedPostal];
    if (!cached) {
      console.log(
        "[searchCacheRepository] No cached results for postal code:",
        normalizedPostal
      );
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_EXPIRY_MS) {
      console.log(
        "[searchCacheRepository] Cached results expired for postal code:",
        normalizedPostal
      );
      return null;
    }

    console.log(
      `[searchCacheRepository] Found ${cached.representatives.length} cached representatives for postal code:`,
      normalizedPostal,
      `(cached ${Math.floor(age / 1000 / 60)} minutes ago)`
    );
    return cached.representatives;
  },

  /**
   * Check if we have cached results for a postal code
   */
  hasCachedSearch: async (postalCode: string): Promise<boolean> => {
    const cached = await searchCacheRepository.getCachedSearch(postalCode);
    return cached !== null;
  },

  /**
   * Clear cache for specific postal codes or all cache
   */
  clearCache: async (postalCode?: string): Promise<void> => {
    if (postalCode) {
      const normalizedPostal = normalizePostalCode(postalCode);
      const cache = await getCache();

      if (cache[normalizedPostal]) {
        delete cache[normalizedPostal];
        await saveCache(cache);
        console.log(`[searchCacheRepository] Cache cleared for postal code: ${normalizedPostal}`);
      }
    } else {
      await Preferences.remove({ key: CACHE_KEY });
      console.log("[searchCacheRepository] Cache cleared");
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats: async (): Promise<{
    totalCached: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  }> => {
    const cache = await getCache();
    const entries = Object.values(cache);

    if (entries.length === 0) {
      return { totalCached: 0, oldestEntry: null, newestEntry: null };
    }

    const timestamps = entries.map((e) => e.timestamp);
    return {
      totalCached: entries.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  },
};
