import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { fetchRepsByPostalLocal } from "@/lib/localSearchService";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { useUserData } from "@/hooks/use-user-data";
import { logActivity } from "@/lib/storage/activityRepository";
import { springSnappy, springSoft } from "@/components/civic/motion";

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
      setQuery(initialQuery);

      // Automatically trigger search if shouldAutoSearch is true
      if (shouldAutoSearch && initialQuery.trim()) {
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
      // Use local postal data + Represent API approach (completely offline-first)
      const results = await fetchRepsByPostalLocal(trimmedQuery);
      onSearchComplete(results);

      // Log the search activity with representatives
      await logActivity({
        type: "search",
        query: trimmedQuery,
        searchType: "postalCode",
        ts: Date.now(),
        representatives: results, // Store the representatives found
      });

      if (results.length > 0) {
        incrementSearchCount();
        updateLastSearch(trimmedQuery, 'postalCode');
      } else {
        toast({
          title: "No representatives found",
          description: "We couldn't find any representatives for this postal code. Please check the format and try again.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('[SearchForm] Search error:', error);

      // Provide specific error messages for local postal data + Represent API
      let errorMessage = "Could not retrieve representatives using local postal data. Please ensure you have internet access for the Represent API and try again.";
      let errorTitle = "Search failed";

      // Check for specific error patterns
      if (error instanceof Error) {
        const errorString = error.message.toLowerCase();
        if (errorString.includes('invalid canadian postal code format')) {
          errorMessage = `The postal code "${trimmedQuery}" doesn't appear to be a valid Canadian postal code. Please check the format (e.g., K1A 0A9).`;
          errorTitle = "Invalid postal code";
        } else if (errorString.includes('postal code not found in database')) {
          errorMessage = `The postal code "${trimmedQuery}" is not in our local database. Please verify the postal code is correct and try again.`;
          errorTitle = "Postal code not found";
        } else if (errorString.includes('postal code database not loaded')) {
          errorMessage = "The postal code database is currently loading. Please try again in a moment.";
          errorTitle = "Database loading";
        } else if (errorString.includes('no representatives found')) {
          errorMessage = `No representatives found for postal code "${trimmedQuery}". This might be a new postal code or area not covered in the database.`;
          errorTitle = "No representatives found";
        } else if (errorString.includes('network') || errorString.includes('fetch') || errorString.includes('server error')) {
          errorMessage = "Network connection error. Please check your internet connection and try again.";
          errorTitle = "Connection error";
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      onSearchComplete([]);
      if (onSearchError) {
        onSearchError(errorMessage);
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
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); handleManualSearch(); }}>
        <div className="relative" ref={dropdownRef}>
          {/* Focus glow ring — opacity only, no layout impact */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[1rem]"
            style={{
              boxShadow: "0 0 0 4px color-mix(in srgb, var(--civic-blue) 24%, transparent)",
            }}
            initial={false}
            animate={{ opacity: inputFocused ? 1 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
          <Input
            type="text"
            placeholder="Postal code — K1A 0A9"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            className="civic-search-input relative pl-14 pr-4 font-semibold text-foreground placeholder:text-muted-foreground"
          />
          <Search className="absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors" />

          {/* Floating validation card */}
          <AnimatePresence>
            {showDropdown && dropdownContent && (
              <motion.div
                key="postal-feedback"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={springSoft}
                className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-card p-4 shadow-2xl"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="civic-primary-button relative mt-3 w-full overflow-hidden text-base font-bold active:translate-y-px"
        >
          {!reduceMotion && !isSearching && query.trim() && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,.32), transparent)",
              }}
              initial={{ x: "-140%" }}
              animate={{ x: ["-140%", "420%"] }}
              transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.2 }}
            />
          )}
          {isSearching ? (
            <Loader2 className="relative z-10 mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Search className="relative z-10 mr-2 h-5 w-5" />
          )}
          <span className="relative z-10">Find my representatives</span>
        </Button>
      </form>
    </div>
  );
}

