import { useState } from "react";
import { useLocation } from "wouter";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Search, Loader2, UserSearch, ArrowLeft } from "lucide-react";
import type { Representative } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchRepsByNameBackend } from "@/lib/backendSearchService";
import { logActivity } from "@/lib/storage/activityRepository";

// R-based name search already handles sorting using R logic (Federal -> Provincial -> Municipal)
// No additional sorting needed as fetchRepsByNameBackend returns properly sorted results

export default function NameSearch() {
  const [, setLocation] = useLocation();
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchError("Please enter a name to search");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await fetchRepsByNameBackend(trimmedQuery);

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

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Postal Code Search
          </Button>

          <h2 className="text-3xl font-bold text-center mb-2">Search by Name</h2>
          <p className="text-center text-muted-foreground text-sm mb-6">
            Find representatives by first name, last name, or full name
          </p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter representative's name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                disabled={isSearching}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> You can search by first name only (e.g., "Justin"),
              last name only (e.g., "Trudeau"), or full name (e.g., "Justin Trudeau")
            </p>
          </div>
        </Section>

        {searchError && (
          <Section>
            <Alert variant="destructive">
              <UserSearch className="h-4 w-4" />
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          </Section>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !isSearching && (
          <Section className="space-y-4">
            <h3 className="text-lg font-semibold">
              Found {searchResults.length} representative{searchResults.length !== 1 ? 's' : ''}
            </h3>
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
            <Card className="text-center py-8">
              <CardContent className="flex flex-col items-center justify-center">
                <UserSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle className="text-xl font-semibold mb-2">Ready to Search</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Enter a representative's name above to find them across all levels of government
                </p>
              </CardContent>
            </Card>
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
