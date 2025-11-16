import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getRecentActivity, subscribeActivityChanges, type ActivityItem } from "@/lib/storage/activityRepository";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Representative } from "@shared/schema";

// Helper function to sort representatives by government level
const sortRepresentatives = (representatives: Representative[]): Representative[] => {
  return [...representatives].sort((a, b) => {
    const getLevel = (office: string | null | undefined): number => {
      if (!office) return 999;
      const o = office.toLowerCase();
      if (o === 'mp') return 1;
      if (o === 'mpp' || o === 'mla' || o === 'mna') return 2;
      if (o === 'mayor' || o === 'councillor' || o === 'councilor') return 3;
      return 999;
    };
    return getLevel(a.electedOffice) - getLevel(b.electedOffice);
  });
};

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const refresh = async () => {
    setIsLoading(true);
    const activities = await getRecentActivity(50);
    setItems(activities);
    setIsLoading(false);
  };

  const handleSearchClick = async (activity: ActivityItem) => {
    if (!activity.query) return;

    console.log('[Activity] Clicked search:', activity.query, '- performing fresh search (no caching)');

    console.log('[Activity] Navigating to home for fresh search');

    // Navigate to home
    setLocation('/');
  };

  useEffect(() => {
    refresh();

    // Subscribe to activity changes
    const unsubscribe = subscribeActivityChanges(() => {
      refresh();
    });

    return unsubscribe;
  }, []);

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <h2 className="text-3xl font-bold text-center">Recent Searches</h2>
        </Section>

        <Section>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent className="flex flex-col items-center justify-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No search history</h3>
                <p className="text-sm text-muted-foreground">
                  Start searching to see your history here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((activity: ActivityItem) => (
                <Card
                  key={activity.id}
                  className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSearchClick(activity)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{activity.query}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.ts).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Show representative previews if available */}
                    {activity.representatives && activity.representatives.length > 0 && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {activity.representatives.slice(0, 3).map((rep) => (
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
                          {activity.representatives.length > 3 && (
                            <span className="text-muted-foreground">
                              +{activity.representatives.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
