import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, CheckCircle2, AlertCircle, MapPin, WifiOff } from "lucide-react";
import { isValidPostalCode, POSTAL_MAX_LENGTH } from "@/lib/postal";
import { useSearchState } from "@/hooks/use-search-state";
import { fadeTween } from "@/components/civic/motion";

/**
 * Postal code + location search UI for the Find page.
 *
 * All search state (query, results, loading, errors) lives in the
 * SearchStateProvider — this component is a thin view over it, so swiping
 * between tabs and back keeps everything.
 */
export function SearchForm() {
  const {
    query,
    setQuery,
    runSearch,
    isSearching,
    inputError,
    geoError,
    isLocating,
    locateAndSearch,
  } = useSearchState();
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleManualSearch = () => {
    runSearch(query);
  };

  const getDropdownContent = () => {
    const cleanCode = query.replace(/\s+/g, "");
    const isValid = isValidPostalCode(query);

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
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); handleManualSearch(); }}>
        <div className="relative" ref={dropdownRef}>
          <Input
            type="text"
            placeholder="Postal code — K1A 0A9"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setTimeout(() => setInputFocused(false), 200)}
            className="civic-search-input relative pl-11 font-normal text-foreground"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={POSTAL_MAX_LENGTH}
            aria-invalid={!!inputError}
          />
          <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {/* iOS inline validation — a plain 13px line under the field */}
        {dropdownContent && !inputError && (
          <motion.p
            key="postal-feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fadeTween}
            role="status"
            className="text-footnote mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground"
          >
            {dropdownContent.icon}
            <span className={dropdownContent.className}>{dropdownContent.text}</span>
            <span>{dropdownContent.subtext}</span>
          </motion.p>
        )}

        {/* Inline input validation error (single error path — no toasts) */}
        {inputError && (
          <motion.p
            key="postal-input-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={fadeTween}
            role="alert"
            className="text-footnote mt-2"
            style={{ color: "var(--destructive)" }}
          >
            {inputError}
          </motion.p>
        )}

        <Button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="civic-primary-button mt-3 w-full"
        >
          {isSearching ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Search className="mr-2 h-5 w-5" />
          )}
          <span>Find my representatives</span>
        </Button>
      </form>

      {/* Location flow: inline 13px destructive text on failure, no toasts/alerts */}
      {geoError && (
        <motion.p
          key="geo-error"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={fadeTween}
          role="alert"
          className="text-footnote flex items-start gap-1.5"
          style={{ color: "var(--destructive)" }}
        >
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{geoError}</span>
        </motion.p>
      )}

      <Button
        type="button"
        onClick={() => void locateAndSearch()}
        disabled={isLocating || isSearching}
        className="civic-tinted-button h-11 w-full rounded-xl text-body font-semibold"
      >
        {isLocating ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <MapPin className="mr-2 h-5 w-5" />
        )}
        <span>{isLocating ? "Finding your location…" : "Use my location"}</span>
      </Button>
    </div>
  );
}
