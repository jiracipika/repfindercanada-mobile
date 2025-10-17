import { useState, useEffect } from "react";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, Building, Loader2, Terminal } from "lucide-react";
import type { Representative, Search } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logActivity } from "@/lib/storage/activityRepository";
import { useLocation } from "wouter";

export default function Home() {
  const [location] = useLocation();
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [initialQuery, setInitialQuery] = useState<string>("");

  // Get recent searches
  const { data: recentSearches, isLoading: loadingSearches } = useQuery<Search[]>({
    queryKey: ['/api/searches/recent'],
  });

  // Check for query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');
    if (query) {
      setInitialQuery(query);
      // Clear the URL params after reading them
      window.history.replaceState({}, '', '/');
    }
  }, [location]);

  const handleSearchComplete = (results: Representative[]) => {
    setSearchResults(results);
    setIsSearching(false);
    setSearchError(null);
  };

  const handleSearchStart = () => {
    setSearchResults([]);
    setIsSearching(true);
    setSearchError(null);
  };

  const handleSearchError = (error: string) => {
    setSearchError(error);
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleRecentSearchClick = async (search: Search) => {
    if (search.query) {
      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await fetch('/api/representatives/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search.query, type: search.postalCode ? 'postal_code' : 'name' }),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch recent search results.");
        }
        const data = await response.json();
        setSearchResults(data.representatives || []);

        // Log the search activity
        await logActivity({
          type: "search",
          query: search.query,
          searchType: search.postalCode ? "postalCode" : "name",
          ts: Date.now(),
        });
      } catch (error) {
        console.error('Search error:', error);
        handleSearchError("Failed to load recent search results.");
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <h2 className="text-3xl font-bold text-center mb-6">Find Your Representative</h2>
        <SearchForm
          onSearchStart={handleSearchStart}
          onSearchComplete={handleSearchComplete}
          onSearchError={handleSearchError}
          initialQuery={initialQuery}
        />
      </Section>

      {searchError && (
        <Section>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        </Section>
      )}

      {/* Loading State */}
      {isSearching && (
        <Section>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Finding your representatives...</p>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !isSearching && (
        <Section className="space-y-4">
          <h3 className="text-lg font-semibold">Your Representatives</h3>
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
      {searchResults.length === 0 && !isSearching && !loadingSearches && !searchError && (
        <Section>
          <Card className="text-center py-8">
            <CardContent className="flex flex-col items-center justify-center">
              <Building className="h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-xl font-semibold mb-2">Ready to Connect</CardTitle>
              <p className="text-muted-foreground text-sm">Enter your postal code or name above to find your representatives.</p>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Recent Searches */}
      {recentSearches && recentSearches.length > 0 && (
        <Section>
          <h3 className="text-lg font-semibold mb-4">Recent Searches</h3>
          <div className="space-y-2">
            {loadingSearches ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))
            ) : (
              recentSearches.map((search: Search) => (
                <Button
                  key={search.id}
                  variant="outline"
                  className="w-full justify-between p-3 h-auto rounded-lg"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{search.query}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : ''}
                  </span>
                </Button>
              ))
            )}
          </div>
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
