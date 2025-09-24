import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Loader2 } from "lucide-react";
import { getCurrentLocation } from "@/lib/geolocation";
import { fetchRepsByPostal } from "@/lib/representApi";
import type { Representative } from "@shared/schema";
import { useUserData } from "@/hooks/use-user-data";

interface SearchFormProps {
  onSearchStart: () => void;
  onSearchComplete: (results: Representative[]) => void;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Reverse geocoding failed");
    const data = await response.json();
    return data.postcode || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

export function SearchForm({ onSearchStart, onSearchComplete }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();
  const { incrementSearchCount, updateLastSearch } = useUserData();

  const performSearch = async (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: "Please enter a search query",
        description: "Enter a postal code to search for representatives.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    onSearchStart();

    try {
      const results = await fetchRepsByPostal(trimmedQuery);
      onSearchComplete(results);

      if (results.length > 0) {
        incrementSearchCount();
        updateLastSearch(trimmedQuery);
      } else {
        toast({
          title: "No representatives found",
          description: "Please check your postal code and try again.",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Could not retrieve representatives. Please try again later.",
        variant: "destructive",
      });
      onSearchComplete([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = () => {
    performSearch(query);
  };

  const handleLocationSearch = async () => {
    setIsLocating(true);
    onSearchStart(); // Visually indicate that something is happening

    try {
      const position = await getCurrentLocation();
      const postalCode = await reverseGeocode(position.coords.latitude, position.coords.longitude);

      if (postalCode) {
        setQuery(postalCode);
        await performSearch(postalCode); // Directly search with the fetched postal code
      } else {
        toast({
          title: "Could not determine postal code",
          description: "Please enter your postal code manually.",
          variant: "destructive",
        });
        onSearchComplete([]); // Clear previous results if any
      }
    } catch (error) {
      console.error("Location Error:", error);
      toast({
        title: "Location access denied",
        description: "Please enable location permissions in your settings or enter a postal code manually.",
        variant: "destructive",
      });
      onSearchComplete([]); // Clear previous results if any
    } finally {
      setIsLocating(false);
      // isSearching will be set to false inside performSearch
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter your postal code to discover your MP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-14 pr-4 h-14 text-base rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white placeholder:text-gray-400"
          onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
        />
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleManualSearch}
          disabled={isSearching || isLocating || !query.trim()}
          className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 touch-manipulation shadow-lg active:shadow-md flex items-center justify-center"
        >
          {isSearching && !isLocating ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Search className="h-5 w-5 mr-2" />
          )}
          Search
        </button>
        
        <button
          onClick={handleLocationSearch}
          disabled={isLocating || isSearching}
          className="h-14 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 touch-manipulation shadow-sm active:shadow-none flex items-center justify-center"
        >
          {isLocating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <MapPin className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
