import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, MapPin } from "lucide-react";
import type { Representative } from "@shared/schema";

export default function Search() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nameQuery, setNameQuery] = useState("");

  const handleSearchComplete = (results: Representative[]) => {
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchStart = () => {
    setIsSearching(true);
  };

  const handleNameSearch = async () => {
    if (!nameQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/representatives/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nameQuery, type: 'name' }),
      });
      const data = await response.json();
      setSearchResults(data.representatives || []);
    } catch (error) {
      console.error('Name search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Location Search */}
      <section className="bg-white shadow-sm border-b border-neutral-200">
        <div className="p-4 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-neutral-800 mb-2">Search Representatives</h2>
            <p className="text-neutral-600 text-sm">Find your MP by location or name</p>
          </div>
          
          <SearchForm 
            onSearchStart={handleSearchStart}
            onSearchComplete={handleSearchComplete}
          />
        </div>
      </section>

      {/* Name Search */}
      <section className="bg-white shadow-sm border-b border-neutral-200">
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">Search by Name</h3>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter representative name..."
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleNameSearch}
              disabled={isSearching || !nameQuery.trim()}
            >
              <SearchIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isSearching && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-neutral-600">Searching representatives...</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !isSearching && (
        <section className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">Search Results ({searchResults.length})</h3>
          {searchResults.map((representative) => (
            <RepresentativeCard
              key={representative.id}
              representative={representative}
              onViewProfile={() => setSelectedRepresentative(representative)}
            />
          ))}
        </section>
      )}

      {/* No Results */}
      {searchResults.length === 0 && !isSearching && (nameQuery || false) && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <SearchIcon className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Representatives Found</h3>
            <p className="text-neutral-600 mb-4">Please check your search terms and try again.</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setNameQuery("");
                setSearchResults([]);
              }}
            >
              Clear Search
            </Button>
          </div>
        </div>
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
  );
}
