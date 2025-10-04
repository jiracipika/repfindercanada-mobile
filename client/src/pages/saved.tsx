import { useState, useEffect } from "react";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Search as SearchIcon } from "lucide-react";
import type { Representative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Saved() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [savedRepresentatives, setSavedRepresentatives] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedReps = async () => {
      setIsLoading(true);
      const reps = await repRepository.listSavedReps();
      console.log('[Saved Page] Fetched saved reps:', reps.length, 'reps:', reps);
      setSavedRepresentatives(reps);
      setIsLoading(false);
    };
    fetchSavedReps();

    // Subscribe to saved changes
    const unsubscribe = repRepository.subscribeSavedChanges(() => {
      fetchSavedReps();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <h2 className="text-3xl font-bold text-center">Saved Representatives</h2>
        </Section>

      {isLoading ? (
        <Section className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="w-16 h-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </Section>
      ) : savedRepresentatives && savedRepresentatives.length > 0 ? (
        <Section className="space-y-4">
          {savedRepresentatives.map((representative: Representative) => (
            <RepresentativeCard
              key={representative.id}
              representative={representative}
              onViewProfile={() => setSelectedRepresentative(representative)}
              showSaveButton={true}
            />
          ))}
        </Section>
      ) : (
        <Section>
          <Card className="text-center py-8">
            <CardContent className="flex flex-col items-center justify-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="text-xl font-semibold mb-2">No Saved Representatives</CardTitle>
              <p className="text-muted-foreground mb-4">
                Representatives you save will appear here for quick access.
              </p>
              <Link href="/">
                <Button>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search Representatives
                </Button>
              </Link>
            </CardContent>
          </Card>
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
