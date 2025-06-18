import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import type { Representative } from "@shared/schema";

export default function Saved() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  
  // Simple user ID - in a real app, this would come from authentication
  const userId = "user-1";

  const { data: savedRepresentatives, isLoading } = useQuery({
    queryKey: ['/api/saved', userId],
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold text-neutral-800">Saved Representatives</h2>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start space-x-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4">
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">Saved Representatives</h2>
        <p className="text-neutral-600 text-sm">Your bookmarked representatives</p>
      </div>

      {savedRepresentatives && savedRepresentatives.length > 0 ? (
        <section className="p-4 space-y-4">
          {savedRepresentatives.map((representative: Representative) => (
            <RepresentativeCard
              key={representative.id}
              representative={representative}
              onViewProfile={() => setSelectedRepresentative(representative)}
              showSaveButton={false}
            />
          ))}
        </section>
      ) : (
        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <Heart className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">No Saved Representatives</h3>
            <p className="text-neutral-600 mb-4">
              Representatives you save will appear here for quick access.
            </p>
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
