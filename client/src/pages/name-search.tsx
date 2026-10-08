import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Search, Loader2, UserSearch, ArrowLeft } from "lucide-react";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { EmptyState, ErrorState, Skeleton } from "@/components/civic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchRepsByNameLocal } from "@/lib/localSearchService";
import { fetchRepsByNameBackend } from "@/lib/backendSearchService";
import { logActivity } from "@/lib/storage/activityRepository";

// Local name search already handles sorting using Represent API logic (Federal -> Provincial -> Municipal)
// No additional sorting needed as fetchRepsByNameLocal returns properly sorted results

export default function NameSearch() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const autoRunRef = useRef(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await performSearch(query.trim());
  };

  const performSearch = async (trimmedQuery: string) => {
    if (!trimmedQuery) {
      setSearchError("Please enter a name to search");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      // Try the backend-powered search first to avoid CORS issues and keep
      // the same data transformation logic used across the app.
      let results = await fetchRepsByNameBackend(trimmedQuery);

      // Fallback to direct Represent API search if the backend returns no
      // matches (e.g., for non-federal results) so name search stays useful.
      if (results.length === 0) {
        results = await fetchRepsByNameLocal(trimmedQuery);
      }

      if (results.length === 0) {
        setSearchError(`No representatives found matching "${trimmedQuery}"`);
      } else {
        setSearchResults(results);

        // Log the search activity
        await logActivity({
          type: "search",
          query: trimmedQuery,
          searchType: "name",
          ts: Date.now(),
          representatives: results,
        });
      }
    } catch (error) {
      console.error("Name search error:", error);
      setSearchError("Failed to search. Please check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Re-run a search handed over from the activity page (/name-search?q=...)
  useEffect(() => {
    if (autoRunRef.current) return;
    const q = new URLSearchParams(searchParams).get('q');
    if (q && q.trim()) {
      autoRunRef.current = true;
      setQuery(q.trim());
      void performSearch(q.trim());
    }
  }, [searchParams]);

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="civic-page space-y-6">
        <Section className="civic-page-header">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-3 h-11 gap-2 rounded-full px-3 text-subheadline text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Postal Code Search
          </Button>

          <span className="civic-kicker">All levels of government</span>
          <h2 className="civic-title mt-1">Search by name.</h2>
          <p className="civic-lede">Find representatives by first name, last name, or full name.</p>
        </Section>

        <Section>
          <form onSubmit={handleSearch} className="civic-search-panel space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter representative's name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="civic-search-input pl-9"
                disabled={isSearching}
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
              />
            </div>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="civic-primary-button flex w-full items-center justify-center gap-2 disabled:opacity-60"
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </motion.button>
          </form>
        </Section>

        <Section>
          <p className="px-1 text-footnote text-muted-foreground">
            <strong className="font-semibold text-foreground">Tip:</strong> You can search by first
            name only (e.g., "Justin"), last name only (e.g., "Trudeau"), or full name (e.g.,
            "Justin Trudeau")
          </p>
        </Section>

        {searchError && (
          <Section>
            <ErrorState title="Search error" description={searchError} />
          </Section>
        )}

        {/* Searching skeletons */}
        {isSearching && (
          <Section className="space-y-4" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="civic-panel p-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-12 w-full rounded-xl" />
              </div>
            ))}
          </Section>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !isSearching && (
          <Section className="space-y-4" aria-live="polite">
            <div className="flex items-end justify-between gap-3 px-1">
              <h3 className="text-title3 text-foreground">
                Found {searchResults.length} representative{searchResults.length !== 1 ? 's' : ''}
              </h3>
            </div>
            {searchResults.map((representative) => (
              <RepresentativeCard
                key={representative.id}
                representative={representative}
                onViewProfile={() => setSelectedRepresentative(representative)}
              />
            ))}
          </Section>
        )}

        {/* Empty State */}
        {searchResults.length === 0 && !isSearching && !searchError && (
          <Section>
            <EmptyState
              icon={<UserSearch className="h-7 w-7" />}
              title="Ready to search"
              description="Enter a representative's name above to find them across all levels of government"
            />
          </Section>
        )}

        {/* Representative Modal */}
        {selectedRepresentative && (
          <RepresentativeModal
            representative={selectedRepresentative}
            isOpen={!!selectedRepresentative}
            onClose={() => setSelectedRepresentative(null)}
          />
        )}
      </div>
    </div>
  );
}
