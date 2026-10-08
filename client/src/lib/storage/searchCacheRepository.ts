import { Preferences } from "@capacitor/preferences";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { postalKey } from "@/lib/postal";

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
 * Normalize keys via the canonical postal module (also accepts geo keys
 * like "geo:45.42153,-75.69719" — compaction uppercases and strips spaces,
 * which keeps them stable and unique).
 */
const normalizeKey = (key: string): string => postalKey(key);

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
    const normalizedPostal = normalizeKey(postalCode);
    const cache = await getCache();

    cache[normalizedPostal] = {
      query: postalCode,
      representatives,
      timestamp: Date.now(),
    };

    await saveCache(cache);
  },

  /**
   * Get cached search results for a postal code
   */
  getCachedSearch: async (
    postalCode: string
  ): Promise<Representative[] | null> => {
    const cached = await searchCacheRepository.getCachedSearchEntry(postalCode);
    return cached ? cached.representatives : null;
  },

  /**
   * Get the full cached entry (results + timestamp) for a key.
   * The timestamp powers the "Showing saved results from <time>" banner.
   */
  getCachedSearchEntry: async (
    postalCode: string
  ): Promise<{ representatives: Representative[]; timestamp: number } | null> => {
    const normalizedPostal = normalizeKey(postalCode);
    const cache = await getCache();

    const cached = cache[normalizedPostal];
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_EXPIRY_MS) {
      return null;
    }

    return { representatives: cached.representatives, timestamp: cached.timestamp };
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
      const normalizedPostal = normalizeKey(postalCode);
      const cache = await getCache();

      if (cache[normalizedPostal]) {
        delete cache[normalizedPostal];
        await saveCache(cache);
      }
    } else {
      await Preferences.remove({ key: CACHE_KEY });
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
