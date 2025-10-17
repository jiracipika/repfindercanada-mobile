import { useEffect, useState } from "react";
import { getRecentActivity, type ActivityItem } from "@/lib/storage/activityRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Search, Loader2 } from "lucide-react";
import { Section } from "@/components/ui/section";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchingId, setSearchingId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const refresh = async () => {
    setIsLoading(true);
    const activities = await getRecentActivity(50);
    setItems(activities);
    setIsLoading(false);
  };

  const handleActivityClick = async (item: ActivityItem) => {
    if (!item.query) return;

    setSearchingId(item.id);
    try {
      const response = await fetch('/api/representatives/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: item.query,
          type: item.searchType === 'postalCode' ? 'postal_code' : 'name'
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search");
      }

      // Navigate to home page with search results
      setLocation('/');

      toast({
        title: "Search completed",
        description: `Found results for "${item.query}"`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Could not complete the search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSearchingId(null);
    }
  };

  useEffect(() => {
    refresh();

    // Refresh on focus
    const handleFocus = () => {
      refresh();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-24">
        <Section className="pt-8 pb-4">
          <h2 className="text-3xl font-bold text-center">Activity</h2>
        </Section>

        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No search activity yet. Start searching to see your history here.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleActivityClick(item)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    {searchingId === item.id ? (
                      <Loader2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.query}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.searchType === "postalCode" ? "Postal Code" : "Name"} search
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.ts).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  );
}
