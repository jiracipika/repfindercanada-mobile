import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { getRecentActivity, clearActivity, subscribeActivityChanges, type ActivityItem } from "@/lib/storage/activityRepository";
import { useSearchState } from "@/hooks/use-search-state";
import { isValidPostalCode } from "@/lib/postal";
import { ChevronRight, Clock, Trash2, Users } from "lucide-react";
import { EmptyState, ListGroup, Skeleton } from "@/components/civic";
import { entranceTween } from "@/components/civic/motion";
import { Section } from "@/components/ui/section";
import type { ApiRepresentative as Representative } from "@shared/schema";

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

void sortRepresentatives;

export default function Activity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { runSearch } = useSearchState();

  // Two-tap confirm state for "Clear History" (no window.confirm/alert).
  const [confirmingClear, setConfirmingClear] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    const activities = await getRecentActivity(50);
    setItems(activities);
    setIsLoading(false);
  };

  const handleSearchClick = async (activity: ActivityItem) => {
    if (!activity.query) return;

    // Re-run the search the history entry represents.
    if (activity.searchType === 'postalCode' && isValidPostalCode(activity.query)) {
      runSearch(activity.query);
      setLocation('/');
      return;
    }

    // Name searches re-run on the name-search page via query param.
    if (activity.searchType === 'name') {
      setLocation(`/name-search?q=${encodeURIComponent(activity.query)}`);
      return;
    }

    // Other entry types (location lookups) cannot be re-run from stored data —
    // go to the Find page like before.
    setLocation('/');
  };

  const handleClearHistory = async () => {
    if (!confirmingClear) {
      // First tap: arm the confirm state for 3 seconds.
      setConfirmingClear(true);
      clearTimerRef.current = window.setTimeout(() => setConfirmingClear(false), 3000);
      return;
    }
    // Second tap: actually clear.
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setConfirmingClear(false);
    await clearActivity();
  };

  useEffect(() => {
    refresh();

    // Subscribe to activity changes
    const unsubscribe = subscribeActivityChanges(() => {
      refresh();
    });

    return () => {
      unsubscribe();
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="civic-page space-y-6">
        <Section className="civic-page-header">
          <span className="civic-kicker">Local lookup history</span>
          <h2 className="civic-title">Recent searches.</h2>
          <p className="civic-lede">Return to districts you have looked up without rebuilding your context.</p>
        </Section>

        <Section>
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-7 w-7" />}
              title="No search history"
              description="Start searching to see your history here."
            />
          ) : (
            <ListGroup>
              <AnimatePresence initial={false}>
                {items.map((activity: ActivityItem, index: number) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0, transition: entranceTween }}
                    exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: "easeInOut" } }}
                    className="overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => handleSearchClick(activity)}
                      className="relative flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60"
                    >
                      {index > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute left-4 right-0 top-0 h-px"
                          style={{ background: "var(--border)" }}
                        />
                      )}
                      <Clock className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-foreground">{activity.query}</span>
                        <span className="mt-0.5 block text-footnote text-muted-foreground">
                          {new Date(activity.ts).toLocaleDateString()}
                        </span>

                        {/* Show representative previews if available */}
                        {activity.representatives && activity.representatives.length > 0 && (
                          <span className="mt-1.5 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex flex-wrap gap-1.5">
                              {activity.representatives.slice(0, 3).map((rep) => (
                                <span
                                  key={rep.id}
                                  className="inline-flex items-center rounded-full px-2 py-0.5 text-caption2 text-primary"
                                  style={{
                                    backgroundColor:
                                      "color-mix(in srgb, var(--primary) 12%, transparent)",
                                  }}
                                >
                                  {rep.name}
                                  {rep.electedOffice && (
                                    <span className="ml-1 opacity-75">
                                      ({rep.electedOffice})
                                    </span>
                                  )}
                                </span>
                              ))}
                              {activity.representatives.length > 3 && (
                                <span className="text-caption1 text-muted-foreground">
                                  +{activity.representatives.length - 3} more
                                </span>
                              )}
                            </span>
                          </span>
                        )}
                      </span>
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </ListGroup>
          )}
        </Section>

        {!isLoading && items.length > 0 && (
          <Section>
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl text-footnote font-semibold transition-colors active:opacity-70"
              style={{
                color: "var(--destructive)",
                backgroundColor: confirmingClear
                  ? "color-mix(in srgb, var(--destructive) 12%, transparent)"
                  : "transparent",
              }}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              {confirmingClear ? "Tap again to confirm" : "Clear History"}
            </button>
          </Section>
        )}
      </div>
    </div>
  );
}
