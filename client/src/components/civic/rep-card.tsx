import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, Mail, MapPin, Phone, Trash2, User } from "lucide-react";
import type { ApiRepresentative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { springSoft } from "./motion";
import { PartyBadge, hasPartyAffiliation } from "./party-badge";
import { LevelChip } from "./level-chip";

export interface RepresentativeCardProps {
  representative: ApiRepresentative;
  onViewProfile: () => void;
  showSaveButton?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

export function getPositionLabel(electedOffice?: string | null): string {
  if (!electedOffice) return "Representative";

  const office = electedOffice.toLowerCase();

  // Federal
  if (office === "mp") return "Member of Parliament";

  // Provincial
  if (office === "mla") return "Member of Legislative Assembly";
  if (office === "mpp") return "Member of Provincial Parliament";
  if (office === "mna") return "Member of National Assembly";

  // Municipal
  if (office === "mayor") return "Mayor";
  if (office === "councillor") return "City Councillor";
  if (office.includes("councillor")) return "Councillor";
  if (office.includes("councilor")) return "Councilor";

  // Default: capitalize first letter of each word
  return electedOffice
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Rebuilt representative card (token system 2.0). Behaviour — save/subscribe,
 * toasts, alerts — is byte-identical to the previous card; only the visuals
 * changed. Exported as `RepCard`; `components/representative-card` re-exports
 * it under the old name so pages keep compiling.
 */
export function RepCard({
  representative,
  onViewProfile,
  showSaveButton = true,
  showDeleteButton = false,
  onDelete,
}: RepresentativeCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const { toast } = useToast();

  // Reset the avatar error flag when a different photo is rendered
  useEffect(() => {
    setAvatarFailed(false);
  }, [representative.id, representative.photo]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      const saved = await repRepository.isSaved(representative.id);
      setIsSaved(saved);
    };
    checkSavedStatus();

    // Subscribe to saved changes to update heart in real-time
    const unsubscribe = repRepository.subscribeSavedChanges(() => {
      checkSavedStatus();
    });

    return () => unsubscribe();
  }, [representative.id]);

  const handleSave = async () => {
    try {
      if (isSaved) {
        await repRepository.removeRep(representative.id);
        // Don't manually set state - let the subscription handle it
        toast({
          title: "Removed from saved",
          description: "Representative removed from your saved list",
        });
      } else {
        await repRepository.saveRep(representative);
        // Don't manually set state - let the subscription handle it
        toast({
          title: "Saved successfully",
          description: "Representative added to your saved list",
        });
      }
    } catch (error) {
      console.error("Failed to update saved status:", error);
      toast({
        title: "Error",
        description: "Failed to update saved status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      // Call onDelete first for optimistic UI update
      if (onDelete) {
        onDelete();
      }
      await repRepository.removeRep(representative.id);
      toast({
        title: "Removed from saved",
        description: "Representative removed from your saved list",
      });
    } catch (error) {
      console.error("Failed to delete representative:", error);
      toast({
        title: "Error",
        description: "Failed to remove representative",
        variant: "destructive",
      });
      // On error, the subscription will restore the correct state
    }
  };

  const handleOpenSource = () => {
    if (representative.website) { // Assuming 'website' holds the source URL
      window.open(representative.website, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCall = () => {
    if (!representative.phone) {
      alert('No phone number available for this representative');
      return;
    }
    const phoneNumber = representative.phone;
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleEmail = () => {
    if (representative.email) {
      window.open(`mailto:${representative.email}`, '_self');
    } else {
      // Show message that no email is available
      alert('No email address available for this representative');
    }
  };

  void handleOpenSource;

  return (
    <motion.article
      data-civic-card="true"
      initial="hidden"
      animate="show"
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: springSoft } }}
      whileTap={{ scale: 0.995 }}
      className="overflow-hidden p-4"
    >
      <div className="flex items-start space-x-4">
        <Avatar className="h-16 w-16 border-2 shadow-lg" style={{ borderColor: "color-mix(in srgb, var(--civic-blue) 40%, transparent)" }}>
          {!avatarFailed && representative.photo && (
            <AvatarImage
              src={representative.photo}
              alt={`${representative.name} photo`}
              className="object-cover"
              onError={() => setAvatarFailed(true)}
            />
          )}
          <AvatarFallback
            className="text-lg font-bold text-neutral-900"
            style={{ background: "linear-gradient(135deg, var(--civic-blue), var(--civic-mint))" }}
          >
            {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight text-foreground">
              {representative.name}
            </h3>
            <div className="flex gap-1">
              {showSaveButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  aria-label={isSaved ? `Remove ${representative.name} from saved representatives` : `Save ${representative.name}`}
                  className="h-11 w-11 shrink-0 rounded-full border border-border bg-background/40"
                >
                  {isSaved ? (
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                  ) : (
                    <Heart className="h-5 w-5 text-neutral-400" />
                  )}
                </Button>
              )}
              {showDeleteButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  aria-label={`Delete ${representative.name} from saved representatives`}
                  className="h-11 w-11 shrink-0 rounded-full border border-border bg-background/40"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasPartyAffiliation(representative.party) && representative.party && (
              <PartyBadge party={representative.party} />
            )}
            {representative.level && representative.level !== "other" && (
              <LevelChip
                level={representative.level}
                electedOffice={representative.electedOffice}
              />
            )}
          </div>

          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {representative.constituency || representative.riding || "No constituency information"}
              </span>
            </div>

            <div className="flex items-center text-muted-foreground">
              <User className="mr-2 h-4 w-4 shrink-0" />
              <span>{getPositionLabel(representative.electedOffice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Actions */}
      <div className="mt-5 border-t border-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className={`min-h-14 rounded-xl border-border bg-background/35 font-bold ${!representative.phone ? "opacity-50" : ""}`}
            onClick={handleCall}
            disabled={!representative.phone}
          >
            <Phone className="mr-2 h-4 w-4" />
            <span className="text-sm font-bold">
              {representative.phone ? "Call" : "No Phone"}
            </span>
          </Button>

          <Button
            variant="outline"
            className={`min-h-14 rounded-xl border-border bg-background/35 font-bold ${!representative.email ? "opacity-50" : ""}`}
            onClick={handleEmail}
            disabled={!representative.email}
          >
            <Mail className="mr-2 h-4 w-4" />
            <span className="text-sm font-bold">
              {representative.email ? "Email" : "No Email"}
            </span>
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <Button
          variant="outline"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border-border bg-background/20"
          onClick={onViewProfile}
        >
          <User className="mr-2 h-4 w-4" />
          <span className="text-sm font-medium">View Full Profile</span>
        </Button>
      </div>
    </motion.article>
  );
}
