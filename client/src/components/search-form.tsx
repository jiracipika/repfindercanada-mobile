import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { lookupByPostalCode } from "@/lib/postal-code-lookup";
import type { Representative } from "@shared/schema";
import { useUserData } from "@/hooks/use-user-data";
import { logActivity } from "@/lib/storage/activityRepository";
import { searchCacheRepository } from "@/lib/storage/searchCacheRepository";

interface SearchFormProps {
  onSearchStart: () => void;
  onSearchComplete: (results: Representative[]) => void;
  onSearchError?: (error: string) => void;
  initialQuery?: string; // Allow parent to set initial query
  shouldAutoSearch?: boolean; // Trigger search automatically when initialQuery is set
}

export function SearchForm({ onSearchStart, onSearchComplete, onSearchError, initialQuery, shouldAutoSearch }: SearchFormProps) {
  const { userData, incrementSearchCount, updateLastSearch } = useUserData();
  const [query, setQuery] = useState(() => {
    return userData?.lastPostalCodeSearch || "";
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [pendingAutoSearch, setPendingAutoSearch] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.lastPostalCodeSearch) {
      setQuery(userData.lastPostalCodeSearch);
    }
  }, [userData?.lastPostalCodeSearch]);

  // Update query when initialQuery prop changes (from parent)
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== null) {
      console.log('[SearchForm] Received initialQuery:', initialQuery, 'shouldAutoSearch:', shouldAutoSearch);
      setQuery(initialQuery);

      // Automatically trigger search if shouldAutoSearch is true
      if (shouldAutoSearch && initialQuery.trim()) {
        console.log('[SearchForm] Setting up auto-search for:', initialQuery);
        setPendingAutoSearch(initialQuery);
      }
    }
  }, [initialQuery, shouldAutoSearch]);

  // Show dropdown when user is typing and input is focused
  useEffect(() => {
    const shouldShow = inputFocused && query.length >= 1 && !isSearching;
    setShowDropdown(shouldShow);
  }, [query, inputFocused, isSearching]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Validate postal code format (basic Canadian postal code validation)
  const isValidPostalCodeFormat = (code: string): boolean => {
    const cleanCode = code.replace(/\s+/g, "");
    // Canadian postal code: A1A1A1 (letter-digit-letter digit-letter-digit)
    const regex = /^[A-Z]\d[A-Z]\d[A-Z]\d$/i;
    return regex.test(cleanCode);
  };

  const performSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: "Please enter a postal code",
        description: "Enter your postal code to search for representatives.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    onSearchStart();

    try {
      console.log('[SearchForm] Looking up postal code:', trimmedQuery);

      // Use new hybrid lookup: Represent API + local IndexedDB
      const lookupResult = await lookupByPostalCode(trimmedQuery);

      if (!lookupResult) {
        toast({
          title: "No representative found",
          description: "Please check your postal code and try again.",
          variant: "destructive",
        });
        onSearchComplete([]);
        return;
      }

      // Convert FederalMP to Representative format
      const representative: Representative = {
        id: parseInt(lookupResult.mp.id) || 0,
        name: lookupResult.mp.name,
        party: lookupResult.mp.party,
        constituency: lookupResult.mp.riding,
        province: lookupResult.mp.province,
        electedOffice: 'MP',
        email: lookupResult.mp.email,
        phone: lookupResult.mp.phone,
        photo: lookupResult.mp.photoUrl,
        website: lookupResult.mp.profileUrl,
        personalWebsite: null,
        socialMedia: null,
        biography: null,
        offices: lookupResult.mp.offices ? JSON.parse(JSON.stringify(lookupResult.mp.offices)) : null,
        fax: null,
        parliamentId: lookupResult.mp.id,
        boundaryUrl: null,
        boundaryData: null,
        dataQuality: {
          source: lookupResult.source,
          confidence: lookupResult.confidence,
          warnings: lookupResult.warnings || [],
        },
        createdAt: new Date(),
      };

      const results = [representative];

      // Cache the results for offline use
      const cleanQuery = trimmedQuery.replace(/\s+/g, "").toUpperCase();
      await searchCacheRepository.cacheSearch(cleanQuery, results);
      console.log('[SearchForm] Cached representative with confidence:', lookupResult.confidence);

      onSearchComplete(results);

      // Log the search activity
      await logActivity({
        type: "search",
        query: trimmedQuery,
        searchType: "postalCode",
        ts: Date.now(),
        representatives: results,
      });

      incrementSearchCount();
      updateLastSearch(trimmedQuery, 'postalCode');

      // Show confidence indicator
      if (lookupResult.confidence === 'high' && lookupResult.source === 'cache_manual') {
        toast({
          title: "Verified Result",
          description: `Found ${representative.name} (manually verified correction)`,
        });
      } else if (lookupResult.confidence === 'low') {
        toast({
          title: "Unverified Result",
          description: "This result could not be verified. Please double-check with Elections Canada.",
          variant: "default",
        });
      }

      // Show warnings if present
      if (lookupResult.warnings && lookupResult.warnings.length > 0) {
        console.warn('[SearchForm] Lookup warnings:', lookupResult.warnings);
      }
    } catch (error) {
      console.error('[SearchForm] Postal code lookup error:', error);

      // Try to get cached data as a last resort
      const cleanQuery = trimmedQuery.replace(/\s+/g, "").toUpperCase();
      const cachedResults = await searchCacheRepository.getCachedSearch(cleanQuery);

      if (cachedResults && cachedResults.length > 0) {
        // We have cached data, use it!
        onSearchComplete(cachedResults);
        toast({
          title: "Using cached data",
          description: "Unable to look up postal code. Showing previously downloaded results.",
          variant: "default",
        });
      } else {
        // No cached data available
        const errorMessage = "Could not retrieve representative. Please check your connection and try again.";
        toast({
          title: "Search failed",
          description: errorMessage,
          variant: "destructive",
        });
        onSearchComplete([]);
        if (onSearchError) {
          onSearchError(errorMessage);
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = () => {
    performSearch(query);
  };

  // Handle pending auto-search after performSearch is available
  useEffect(() => {
    if (pendingAutoSearch && !isSearching) {
      console.log('[SearchForm] Executing auto-search for:', pendingAutoSearch);
      performSearch(pendingAutoSearch);
      setPendingAutoSearch(null); // Clear after triggering
    }
  }, [pendingAutoSearch, isSearching]);

  const getDropdownContent = () => {
    const cleanCode = query.replace(/\s+/g, "");
    const isValid = isValidPostalCodeFormat(query);

    if (cleanCode.length < 6) {
      return {
        icon: <Loader2 className="h-4 w-4 text-blue-500 animate-pulse" />,
        text: `Keep typing... (${cleanCode.length}/6 characters)`,
        subtext: "Canadian postal codes are 6 characters (e.g., K1A0A9)",
        className: "text-muted-foreground"
      };
    }

    if (isValid) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        text: "Valid postal code format",
        subtext: "Press Enter or click Search to find your representatives",
        className: "text-green-700 dark:text-green-400"
      };
    }

    return {
      icon: <AlertCircle className="h-4 w-4 text-amber-500" />,
      text: "Check postal code format",
      subtext: "Format: A1A 1A1 (letter-digit-letter digit-letter-digit)",
      className: "text-amber-700 dark:text-amber-400"
    };
  };

  const dropdownContent = showDropdown ? getDropdownContent() : null;

  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); handleManualSearch(); }}>
        <div className="relative" ref={dropdownRef}>
          <Input
            type="text"
            placeholder="Enter your postal code (e.g., K1A 0A9)"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            className="pl-14 pr-4 h-14 text-lg font-medium rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />

          {/* Dropdown feedback */}
          {showDropdown && dropdownContent && (
            <div className="absolute z-50 w-full mt-2 p-4 bg-background border-2 border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{dropdownContent.icon}</div>
                <div className="flex-1 space-y-1">
                  <p className={`text-sm font-medium ${dropdownContent.className}`}>
                    {dropdownContent.text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dropdownContent.subtext}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="w-full h-14 rounded-xl text-base font-semibold shadow-sm active:shadow-none mt-3"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Search className="h-5 w-5 mr-2" />
          )}
          Search
        </Button>
      </form>
    </div>
  );
}

