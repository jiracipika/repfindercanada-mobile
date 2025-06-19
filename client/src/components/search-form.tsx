import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, MapPin, Loader2 } from "lucide-react";
import { getCurrentLocation } from "@/lib/geolocation";
import type { Representative } from "@shared/schema";

interface SearchFormProps {
  onSearchStart: () => void;
  onSearchComplete: (results: Representative[]) => void;
}

export function SearchForm({ onSearchStart, onSearchComplete }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Please enter a search query",
        description: "Enter a postal code or address to search for representatives",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    onSearchStart();

    try {
      const response = await fetch('/api/representatives/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(), 
          type: 'postal_code' 
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      onSearchComplete(data.representatives || []);

      if (data.representatives.length === 0) {
        toast({
          title: "No representatives found",
          description: "Please check your postal code and try again",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Please try again later",
        variant: "destructive",
      });
      onSearchComplete([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSearch = async () => {
    setIsLocating(true);
    
    try {
      const position = await getCurrentLocation();
      
      // For now, we'll show a message about postal code requirement
      // In a real app, you'd reverse geocode the coordinates to get postal code
      toast({
        title: "Location detected",
        description: "Please enter your postal code for accurate results",
      });
      
      // You could implement reverse geocoding here
      // const postalCode = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      // setQuery(postalCode);
      
    } catch (error) {
      toast({
        title: "Location access denied",
        description: "Please enter your postal code manually",
        variant: "destructive",
      });
    } finally {
      setIsLocating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter your postal code or address to discover your MP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-14 pr-4 h-14 text-base rounded-2xl border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 bg-gray-50 focus:bg-white placeholder:text-gray-400"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="flex-1 h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 touch-manipulation shadow-lg active:shadow-md flex items-center justify-center"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Search className="h-5 w-5 mr-2" />
          )}
          Search
        </button>
        
        <button
          onClick={handleLocationSearch}
          disabled={isLocating}
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
