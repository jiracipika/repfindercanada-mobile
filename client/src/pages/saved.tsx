import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { EmptyState, Skeleton } from "@/components/civic";
import { Search as SearchIcon } from "lucide-react";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Saved() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [savedRepresentatives, setSavedRepresentatives] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedReps = async () => {
      try {
        const reps = await repRepository.listSavedReps();
        setSavedRepresentatives(reps);
      } catch (error) {
        console.error('[Saved Page] Error fetching saved reps:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    setIsLoading(true);
    fetchSavedReps();

    // Subscribe to saved changes (don't set loading state for updates)
    const unsubscribe = repRepository.subscribeSavedChanges(async () => {
      const reps = await repRepository.listSavedReps();
      setSavedRepresentatives(reps);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="mobile-scroll h-full overflow-y-auto">
      <div className="civic-page space-y-6">
        <Section className="civic-page-header">
          <h2 className="civic-title">Saved representatives.</h2>
          <p className="civic-lede">Keep the people and offices you contact most within easy reach.</p>
        </Section>

        {isLoading ? (
          <Section className="space-y-4" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="civic-panel p-4">
                <div className="flex items-start space-x-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-12 w-full rounded-xl" />
              </div>
            ))}
          </Section>
        ) : savedRepresentatives && savedRepresentatives.length > 0 ? (
          <Section className="space-y-4">
            <AnimatePresence initial={false}>
              {savedRepresentatives.map((representative: Representative) => (
                <motion.div
                  key={representative.id}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.22, ease: "easeInOut" } }}
                  className="overflow-hidden"
                >
                  <RepresentativeCard
                    representative={representative}
                    onViewProfile={() => setSelectedRepresentative(representative)}
                    showSaveButton={false}
                    showDeleteButton={true}
                    onDelete={() => {
                      // Optimistic UI update: remove immediately from local state
                      setSavedRepresentatives(prev => prev.filter(r => r.id !== representative.id));
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Section>
        ) : (
          <Section>
            <EmptyState
              title="No saved representatives"
              description="Tap the heart on any representative to keep them here."
              action={
                <Link href="/">
                  <Button className="civic-primary-button gap-2 px-5">
                    <SearchIcon className="h-4 w-4" />
                    Search representatives
                  </Button>
                </Link>
              }
            />
          </Section>
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
    </div>
  );
}
