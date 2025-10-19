import { useState, useEffect } from "react";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, Building, Loader2, Terminal, Users } from "lucide-react";
import type { Representative, Search } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logActivity, getRecentActivity, subscribeActivityChanges, type ActivityItem } from "@/lib/storage/activityRepository";
import { searchCacheRepository } from "@/lib/storage/searchCacheRepository";
import { useToast } from "@/hooks/use-toast";

// Helper function to sort representatives by government level
// Order: Federal (MP) -> Provincial (MPP/MLA/MNA) -> Municipal (Mayor/Councillor)
const sortRepresentatives = (representatives: Representative[]): Representative[] => {
  return [...representatives].sort((a, b) => {
    const getLevel = (office: string | null | undefined): number => {
      if (!office) return 999; // Unknown goes last
      const o = office.toLowerCase();

      // Federal level (highest priority - shown first)
      if (o === 'mp') return 1;

      // Provincial level
      if (o === 'mpp' || o === 'mla' || o === 'mna') return 2;

      // Municipal level (lowest priority - shown last)
      if (o === 'mayor' || o === 'councillor' || o === 'councilor') return 3;

      return 999; // Unknown offices go last
    };

    return getLevel(a.electedOffice) - getLevel(b.electedOffice);
  });
};

export default function Home() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<ActivityItem[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(true);
  const [triggeredSearch, setTriggeredSearch] = useState<{ query: string; representatives?: Representative[] } | null>(null);
  const { toast } = useToast();

  // Load recent searches from local storage
  useEffect(() => {
    const loadRecentSearches = async () => {
      setLoadingSearches(true);
      const recent = await getRecentActivity(5);
      setRecentSearches(recent);
      setLoadingSearches(false);
    };

    loadRecentSearches();

    // Subscribe to changes
    const unsubscribe = subscribeActivityChanges(() => {
      loadRecentSearches();
    });

    return unsubscribe;
  }, []);

  // Listen for search triggers from Activity page
  useEffect(() => {
    const handleTriggerSearch = (event: CustomEvent) => {
      const { query, representatives } = event.detail;
      setTriggeredSearch({ query, representatives });

      // Show results if we have them
      if (representatives && representatives.length > 0) {
        setSearchResults(sortRepresentatives(representatives));
        toast({
          title: "Loaded from history",
          description: "Showing your previous search results.",
        });
      }
    };

    window.addEventListener('triggerSearch', handleTriggerSearch as EventListener);
    return () => {
      window.removeEventListener('triggerSearch', handleTriggerSearch as EventListener);
    };
  }, [toast]);

  const handleSearchComplete = (results: Representative[]) => {
    setSearchResults(sortRepresentatives(results));
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

  const handleRecentSearchClick = async (activity: ActivityItem) => {
    if (activity.query) {
      // Set the triggered search to populate the search box
      setTriggeredSearch({ query: activity.query, representatives: activity.representatives });

      // If we have representatives stored in the activity, use them directly
      if (activity.representatives && activity.representatives.length > 0) {
        setSearchResults(sortRepresentatives(activity.representatives));
        toast({
          title: "Loaded from history",
          description: "Showing your previous search results.",
        });
        return;
      }

      // Otherwise, try to fetch from cache or API
      setIsSearching(true);
      setSearchError(null);
      try {
        // For postal code searches, check cache first
        if (activity.searchType === "postalCode") {
          const cleanQuery = activity.query.replace(/\s+/g, "").toUpperCase();
          const cachedResults = await searchCacheRepository.getCachedSearch(cleanQuery);

          if (cachedResults && cachedResults.length > 0) {
            setSearchResults(sortRepresentatives(cachedResults));
            toast({
              title: "Loaded from cache",
              description: "Using previously downloaded data for faster results.",
            });
            setIsSearching(false);
            return;
          }
        }

        // If not cached, fetch from API
        const response = await fetch('/api/representatives/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: activity.query, type: activity.searchType === 'postalCode' ? 'postal_code' : 'name' }),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch recent search results.");
        }
        const data = await response.json();
        const reps = data.representatives || [];
        setSearchResults(sortRepresentatives(reps));
      } catch (error) {
        console.error('Search error:', error);

        // Try to use cached data as fallback for postal code searches
        if (activity.searchType === "postalCode") {
          const cleanQuery = activity.query.replace(/\s+/g, "").toUpperCase();
          const cachedResults = await searchCacheRepository.getCachedSearch(cleanQuery);

          if (cachedResults && cachedResults.length > 0) {
            setSearchResults(sortRepresentatives(cachedResults));
            toast({
              title: "Using cached data",
              description: "Unable to reach the server. Showing previously downloaded results.",
            });
            setIsSearching(false);
            return;
          }
        }

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
          initialQuery={triggeredSearch?.query}
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
          <div className="space-y-3">
            {loadingSearches ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))
            ) : (
              recentSearches.map((activity: ActivityItem) => (
                <Card
                  key={activity.id}
                  className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleRecentSearchClick(activity)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{activity.query}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.ts).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Show representative previews if available */}
                    {activity.representatives && activity.representatives.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {activity.representatives.slice(0, 3).map((rep, idx) => (
                            <span
                              key={rep.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepresentative(rep);
                              }}
                            >
                              {rep.name}
                              {rep.electedOffice && (
                                <span className="ml-1 text-[10px] opacity-75">
                                  ({rep.electedOffice})
                                </span>
                              )}
                            </span>
                          ))}
                          {activity.representatives.length > 3 && (
                            <span className="text-muted-foreground">
                              +{activity.representatives.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
