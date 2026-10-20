import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiRepresentative as Representative } from '@shared/schema';
import { fetchRepsByPostalLocal, fetchRepsByCoordinatesLocal } from '@/lib/localSearchService';
import { postalKey } from '@/lib/postal';
import { resolveSearchIntent, textSearchKey } from '@/lib/searchIntent';
import { fetchRepsByTextDirect } from '@/lib/representApiService';
import { searchCacheRepository } from '@/lib/storage/searchCacheRepository';
import { logActivity } from '@/lib/storage/activityRepository';
import { getCurrentLocation } from '@/lib/geolocation';
import { useUserData } from '@/hooks/use-user-data';

/**
 * App-wide unified postal/text/location search state.
 *
 * Lives OUTSIDE the SwipePager pages (mounted above the router) so results,
 * the typed query and any error survive tab swipes — SwipePager unmounts the
 * page component when you swipe away, and this context is what the Find page
 * rehydrates from on remount.
 *
 * Searches run through React Query (key includes the normalized postal code)
 * with a write-through search cache: when the API fails and a cached result
 * exists, the cached results are served with `fromCache: true` so the Find
 * page can show the "Showing saved results from <time>" banner.
 */

export interface SearchOutcome {
  results: Representative[];
  /** True when the API failed and cached results were served instead. */
  fromCache: boolean;
  /** Timestamp of the cached results when `fromCache` is true. */
  cachedAt: number | null;
}

type SubmittedSearch =
  | { kind: 'postal'; raw: string }
  | { kind: 'text'; raw: string; key: string }
  | { kind: 'geo'; key: string; lat: number; lng: number };

interface SearchStateContextType {
  /** Live input value; postal codes normalize only on submission. */
  query: string;
  setQuery: (value: string) => void;
  /** The search currently displayed (null = nothing searched yet). */
  submittedQuery: string | null;
  outcome: SearchOutcome | undefined;
  isSearching: boolean;
  /** Mapped, user-facing error for the last submitted search. */
  error: Error | null;
  /** Inline validation message for the input (invalid format). */
  inputError: string | null;
  /** Inline message for the location flow (permission denied etc.). */
  geoError: string | null;
  isLocating: boolean;
  /** Resolve postal/text intent, validate and search. */
  runSearch: (raw: string) => void;
  /** Re-run the exact failed/current search. */
  retry: () => void;
  /** Device location flow: permissions → coordinates → search. */
  locateAndSearch: () => Promise<void>;
}

const SearchStateContext = createContext<SearchStateContextType | undefined>(undefined);

/** Map low-level search failures to one friendly, user-facing message. */
function mapSearchError(error: unknown, query: string): Error {
  const fallback =
    'Could not retrieve representatives using local postal data. Please ensure you have internet access for the Represent API and try again.';
  if (!(error instanceof Error)) {
    return new Error(fallback);
  }
  const message = error.message.toLowerCase();
  if (message.includes('invalid canadian postal code format')) {
    return new Error(`The postal code "${query}" doesn't appear to be a valid Canadian postal code. Please check the format (e.g., K1A 0A9).`);
  }
  if (message.includes('postal code not found in database') || message.includes('postal code not found')) {
    return new Error(`The postal code "${query}" is not in our local database. Please verify the postal code is correct and try again.`);
  }
  if (message.includes('postal code database not loaded')) {
    return new Error('The postal code database is currently loading. Please try again in a moment.');
  }
  if (message.includes('no representatives found')) {
    return new Error(`No representatives found for postal code "${query}". This might be a new postal code or area not covered in the database.`);
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('server error') || message.includes('failed to parse')) {
    return new Error('Network connection error. Please check your internet connection and try again.');
  }
  return new Error(fallback);
}

function mapGeoError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('permission') || message.includes('denied')) {
    return 'Location permission was not granted. Enable it in Settings, or enter your postal code manually.';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Location request timed out. Try again, or enter your postal code manually.';
  }
  return 'Your location could not be determined. Try again, or enter your postal code manually.';
}

export function SearchStateProvider({ children }: { children: ReactNode }) {
  const { userData, incrementSearchCount, updateLastSearch } = useUserData();
  const [query, setQuery] = useState(() => userData?.lastPostalCodeSearch || '');
  const [submitted, setSubmitted] = useState<SubmittedSearch | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Seed the input once the persisted last search loads (matches the
  // previous SearchForm behaviour).
  useEffect(() => {
    if (userData?.lastPostalCodeSearch) {
      setQuery(userData.lastPostalCodeSearch);
    }
  }, [userData?.lastPostalCodeSearch]);

  const queryKey = useMemo(
    () => ['representative-search', submitted ? (submitted.kind === 'postal' ? postalKey(submitted.raw) : submitted.key) : null] as const,
    [submitted]
  );

  const searchQuery = useQuery({
    queryKey,
    enabled: submitted !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    // Results shown on remount (tab swipe) must not silently refetch —
    // refetches are explicit (new submit / Retry) so history stays honest.
    refetchOnMount: false,
    queryFn: async (): Promise<SearchOutcome> => {
      if (!submitted) {
        throw new Error('No search submitted');
      }

      if (submitted.kind === 'text') {
        try {
          const results = await fetchRepsByTextDirect(submitted.raw);
          await searchCacheRepository.cacheSearch(submitted.key, results);
          await logActivity({ type: 'search', query: submitted.raw, searchType: 'name', ts: Date.now(), representatives: results });
          if (results.length > 0) incrementSearchCount();
          return { results, fromCache: false, cachedAt: null };
        } catch (error) {
          const entry = await searchCacheRepository.getCachedSearchEntry(submitted.key);
          if (entry && entry.representatives.length > 0) {
            return { results: entry.representatives, fromCache: true, cachedAt: entry.timestamp };
          }
          if (error instanceof Error && error.message.includes('429')) {
            throw new Error('Search rate limit reached. Please try again later.');
          }
          throw new Error('Could not search representatives. Please check your internet connection and try again.');
        }
      }

      if (submitted.kind === 'postal') {
        const key = postalKey(submitted.raw);
        try {
          const results = await fetchRepsByPostalLocal(key);
          // Write-through cache so this postal code can be served offline later.
          await searchCacheRepository.cacheSearch(key, results);
          await logActivity({
            type: 'search',
            query: submitted.raw.trim(),
            searchType: 'postalCode',
            ts: Date.now(),
            representatives: results,
          });
          if (results.length > 0) {
            incrementSearchCount();
            updateLastSearch(key, 'postalCode');
          }
          return { results, fromCache: false, cachedAt: null };
        } catch (error) {
          // API failed — serve cached results (with banner) when we have them.
          const entry = await searchCacheRepository.getCachedSearchEntry(key);
          if (entry && entry.representatives.length > 0) {
            return { results: entry.representatives, fromCache: true, cachedAt: entry.timestamp };
          }
          throw mapSearchError(error, submitted.raw.trim());
        }
      }

      // Geolocation search
      try {
        const results = await fetchRepsByCoordinatesLocal(submitted.lat, submitted.lng);
        await searchCacheRepository.cacheSearch(submitted.key, results);
        await logActivity({
          type: 'search',
          query: 'My location',
          searchType: 'location',
          ts: Date.now(),
          representatives: results,
        });
        if (results.length > 0) {
          incrementSearchCount();
        }
        return { results, fromCache: false, cachedAt: null };
      } catch (error) {
        const entry = await searchCacheRepository.getCachedSearchEntry(submitted.key);
        if (entry && entry.representatives.length > 0) {
          return { results: entry.representatives, fromCache: true, cachedAt: entry.timestamp };
        }
        throw new Error('Could not retrieve representatives for your location. Please check your internet connection and try again.');
      }
    },
  });

  const runSearch = useCallback((raw: string) => {
    const intent = resolveSearchIntent(raw);
    if (intent.kind === 'invalid') {
      setInputError(intent.message);
      setSubmitted(null);
      return;
    }
    setInputError(null);
    setGeoError(null);
    setQuery(intent.query);

    const key = intent.kind === 'postal' ? postalKey(intent.query) : textSearchKey(intent.query);
    const currentKey = submitted ? (submitted.kind === 'postal' ? postalKey(submitted.raw) : submitted.key) : null;
    if (currentKey === key) {
      // Same search re-submitted (e.g. after a failure) — force a refetch,
      // because React Query won't refetch a key that already errored.
      void searchQuery.refetch();
    } else {
      setSubmitted(intent.kind === 'postal'
        ? { kind: 'postal', raw: intent.query }
        : { kind: 'text', raw: intent.query, key });
    }
  }, [submitted, searchQuery]);

  const retry = useCallback(() => {
    setInputError(null);
    void searchQuery.refetch();
  }, [searchQuery.refetch]);

  const locateAndSearch = useCallback(async () => {
    setInputError(null);
    setGeoError(null);
    setIsLocating(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      // Truncate to ~1m precision so the query/cache key is stable.
      const lat = Number(latitude.toFixed(5));
      const lng = Number(longitude.toFixed(5));
      const geoKey = `geo:${lat},${lng}`;
      if (submitted && submitted.kind === 'geo' && submitted.key === geoKey) {
        void searchQuery.refetch();
      } else {
        setSubmitted({ kind: 'geo', key: geoKey, lat, lng });
      }
    } catch (error) {
      setGeoError(mapGeoError(error));
    } finally {
      setIsLocating(false);
    }
  }, [submitted, searchQuery]);

  const value = useMemo<SearchStateContextType>(
    () => ({
      query,
      setQuery: (value) => { setQuery(value); setInputError(null); setSubmitted(null); },
      submittedQuery:
        submitted === null
          ? null
          : submitted.kind === 'postal'
            ? postalKey(submitted.raw)
            : submitted.kind === 'text' ? submitted.raw : 'My location',
      outcome: searchQuery.data,
      isSearching: submitted !== null && searchQuery.isFetching,
      error: searchQuery.error instanceof Error ? searchQuery.error : null,
      inputError,
      geoError,
      isLocating,
      runSearch,
      retry,
      locateAndSearch,
    }),
    [query, submitted, searchQuery.data, searchQuery.isFetching, searchQuery.error, inputError, geoError, isLocating, runSearch, retry, locateAndSearch]
  );

  return (
    <SearchStateContext.Provider value={value}>
      {children}
    </SearchStateContext.Provider>
  );
}

export function useSearchState() {
  const context = useContext(SearchStateContext);
  if (context === undefined) {
    throw new Error('useSearchState must be used within a SearchStateProvider');
  }
  return context;
}
