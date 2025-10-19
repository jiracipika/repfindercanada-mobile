import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getRecentActivity, type ActivityItem } from "@/lib/storage/activityRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Search, Users } from "lucide-react";
import { Section } from "@/components/ui/section";

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const refresh = async () => {
    setIsLoading(true);
    const activities = await getRecentActivity(50);
    setItems(activities);
    setIsLoading(false);
  };

  const handleSearchClick = (item: ActivityItem) => {
    // Navigate to home page with the search query
    // We'll use a custom event to trigger the search
    window.dispatchEvent(new CustomEvent('triggerSearch', {
      detail: { query: item.query, representatives: item.representatives }
    }));
    setLocation('/');
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
      <div className="space-y-6 px-4 pt-8 pb-32">
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
                    className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => handleSearchClick(item)}
                  >
                    <div className="flex items-start gap-3">
                      <Search className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
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

                    {/* Show representative previews if available */}
                    {item.representatives && item.representatives.length > 0 && (
                      <div className="flex items-center gap-2 ml-7 flex-wrap">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {item.representatives.slice(0, 3).map((rep) => (
                            <span
                              key={rep.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                            >
                              {rep.name}
                              {rep.electedOffice && (
                                <span className="ml-1 text-[10px] opacity-75">
                                  ({rep.electedOffice})
                                </span>
                              )}
                            </span>
                          ))}
                          {item.representatives.length > 3 && (
                            <span className="text-muted-foreground">
                              +{item.representatives.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
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
