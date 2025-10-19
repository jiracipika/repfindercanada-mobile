import { useState, useEffect } from "react";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Building, Loader2, Terminal } from "lucide-react";
import type { Representative } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [triggeredSearch, setTriggeredSearch] = useState<{ query: string; representatives?: Representative[] } | null>(null);
  const { toast } = useToast();

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
      {searchResults.length === 0 && !isSearching && !searchError && (
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
