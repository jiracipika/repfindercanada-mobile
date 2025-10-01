import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";
import { fetchRepsByPostal } from "@/lib/representApi";
import type { Representative } from "@shared/schema";
import { useUserData } from "@/hooks/use-user-data";
import { logActivity } from "@/lib/storage/activityRepository";

interface SearchFormProps {
  onSearchStart: () => void;
  onSearchComplete: (results: Representative[]) => void;
  onSearchError?: (error: string) => void;
}

export function SearchForm({ onSearchStart, onSearchComplete, onSearchError }: SearchFormProps) {
  const { userData, incrementSearchCount, updateLastSearch } = useUserData();
  const [query, setQuery] = useState(() => {
    return userData?.lastPostalCodeSearch || "";
  });
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userData?.lastPostalCodeSearch) {
      setQuery(userData.lastPostalCodeSearch);
    }
  }, [userData?.lastPostalCodeSearch]);

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
      const results = await fetchRepsByPostal(trimmedQuery);
      onSearchComplete(results);

      // Log the search activity
      await logActivity({
        type: "search",
        query: trimmedQuery,
        searchType: "postalCode",
        ts: Date.now(),
      });

      if (results.length > 0) {
        incrementSearchCount();
        updateLastSearch(trimmedQuery, 'postalCode');
      } else {
        toast({
          title: "No representatives found",
          description: "Please check your postal code and try again.",
        });
      }
    } catch (error) {
      console.error('[SearchForm] Search error:', error);
      const errorMessage = "Could not retrieve representatives. Please try again later.";
      toast({
        title: "Search failed",
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

  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); handleManualSearch(); }}>
        <div className="relative">
          <Input
            type="text"
            placeholder="Enter your postal code (e.g., K1A 0A9)"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            className="pl-14 pr-4 h-14 text-lg font-medium rounded-xl border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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

