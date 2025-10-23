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
import { fetchRepsByName } from "@/lib/representApi";
import { logActivity } from "@/lib/storage/activityRepository";

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

export default function NameSearch() {
  console.log('[NameSearch] Component mounted/rendered');

  const [, setLocation] = useLocation();
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NameSearch] === handleSearch called ===');
    console.log('[NameSearch] Form submitted with query:', query);

    const trimmedQuery = query.trim();
    console.log('[NameSearch] Trimmed query:', trimmedQuery);

    if (!trimmedQuery) {
      console.log('[NameSearch] Empty query, showing error');
      setSearchError("Please enter a name to search");
      return;
    }

    console.log('[NameSearch] Starting search, setting isSearching=true');
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      console.log('[NameSearch] Calling fetchRepsByName with:', trimmedQuery);
      const results = await fetchRepsByName(trimmedQuery);
      console.log('[NameSearch] fetchRepsByName returned:', results.length, 'results');

      if (results.length === 0) {
        console.log('[NameSearch] No results found, showing error');
        setSearchError(`No representatives found matching "${trimmedQuery}"`);
      } else {
        console.log('[NameSearch] Sorting', results.length, 'results');
        const sortedResults = sortRepresentatives(results);
        console.log('[NameSearch] After sorting:', sortedResults.length, 'results');
        console.log('[NameSearch] First result:', sortedResults[0]?.name, '/', sortedResults[0]?.electedOffice);
        setSearchResults(sortedResults);

        // Log the search activity
        console.log('[NameSearch] Logging activity to storage');
        await logActivity({
          type: "search",
          query: trimmedQuery,
          searchType: "name",
          ts: Date.now(),
          representatives: sortedResults,
        });
        console.log('[NameSearch] Activity logged successfully');
      }
    } catch (error) {
      console.error('[NameSearch] !!! Name search error:', error);
      console.error('[NameSearch] !!! Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setSearchError("Failed to search. Please check your connection and try again.");
    } finally {
      console.log('[NameSearch] Search complete, setting isSearching=false');
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
