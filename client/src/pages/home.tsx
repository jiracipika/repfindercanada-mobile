import { useState } from "react";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Clock, Building } from "lucide-react";
import type { Representative, Search } from "@shared/schema";

export default function Home() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get recent searches
  const { data: recentSearches, isLoading: loadingSearches } = useQuery({
    queryKey: ['/api/searches/recent'],
  });

  const handleSearchComplete = (results: Representative[]) => {
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSearchStart = () => {
    setIsSearching(true);
  };

  const handleRecentSearchClick = async (search: Search) => {
    if (search.query) {
      setIsSearching(true);
      try {
        const response = await fetch('/api/representatives/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search.query, type: search.postalCode ? 'postal_code' : 'name' }),
        });
        const data = await response.json();
        setSearchResults(data.representatives || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white px-4 py-8">
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-gray-900 leading-tight">Find Your Representative</h2>
            <p className="text-gray-600 text-base max-w-sm mx-auto leading-relaxed">
              Connect with your Member of Parliament and stay engaged with Canadian democracy
            </p>
          </div>
          
          <SearchForm 
            onSearchStart={handleSearchStart}
            onSearchComplete={handleSearchComplete}
          />
        </div>
      </section>

      {/* Loading State */}
      {isSearching && (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-neutral-600">Finding your representatives...</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && !isSearching && (
        <section className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800">Your Representatives</h3>
          {searchResults.map((representative) => (
            <RepresentativeCard
              key={representative.id}
              representative={representative}
              onViewProfile={() => setSelectedRepresentative(representative)}
            />
          ))}
        </section>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && !isSearching && !loadingSearches && (
        <div className="px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Connect</h3>
            <p className="text-gray-600 text-sm">Enter your postal code above to find your MP and get their contact information</p>
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches && recentSearches.length > 0 && (
        <section className="p-4 mt-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-3">Recent Searches</h3>
          <div className="space-y-2">
            {loadingSearches ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (
              recentSearches.map((search: Search) => (
                <Button
                  key={search.id}
                  variant="outline"
                  className="w-full justify-between p-3 h-auto"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    <span className="font-medium">{search.query}</span>
                  </div>
                  <span className="text-xs text-neutral-500">
                    {search.createdAt ? new Date(search.createdAt).toLocaleDateString() : ''}
                  </span>
                </Button>
              ))
            )}
          </div>
        </section>
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
