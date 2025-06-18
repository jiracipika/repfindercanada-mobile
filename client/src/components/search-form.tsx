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
    <div className="space-y-4">
      <div className="relative">
        <Input
          type="text"
          placeholder="Enter postal code (e.g., K1A 0A6)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 h-12 text-base"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="h-12"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Search className="h-4 w-4 mr-2" />
          )}
          Search
        </Button>
        
        <Button
          variant="outline"
          onClick={handleLocationSearch}
          disabled={isLocating}
          className="h-12"
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 mr-2" />
          )}
          Use My Location
        </Button>
      </div>
    </div>
  );
}
