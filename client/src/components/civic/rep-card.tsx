import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Heart, Mail, Phone, Trash2 } from "lucide-react";
import type { ApiRepresentative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { hapticLight } from "@/lib/native-shell";
import { fadeUp } from "./motion";
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
 * Representative card: an identity block (photo, name, office and district,
 * party and level) that opens the profile, with one quiet action row — call,
 * email, profile. Save/delete live on the heart and bin at the top right.
 * Save/subscribe, toasts and alerts behave exactly as the previous card did.
 * Exported as `RepCard`; `components/representative-card` re-exports it under
 * the old name so pages keep compiling.
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
      hapticLight();
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
      // Buttons are disabled when the field is missing; toast as a safety net.
      toast({
        title: "Not available",
        description: "No phone number is listed for this representative",
      });
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
      // Buttons are disabled when the field is missing; toast as a safety net.
      toast({
        title: "Not available",
        description: "No email address is listed for this representative",
      });
    }
  };

  void handleOpenSource;

  const place = representative.constituency || representative.riding || "";
  const party = hasPartyAffiliation(representative.party) ? representative.party : undefined;
  const showLevel = Boolean(representative.level) && representative.level !== "other";

  return (
    <motion.article
      data-civic-card="true"
      initial="hidden"
      animate="show"
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      className="overflow-hidden p-4"
    >
      <div className="flex items-start gap-3">
        {/* Identity. Tapping it opens the profile; "Profile" in the action row
            below is the same destination, reachable by keyboard. */}
        <div className="flex min-w-0 flex-1 cursor-pointer items-start gap-3" onClick={onViewProfile}>
          <Avatar className="h-14 w-14 shrink-0">
            {!avatarFailed && representative.photo && (
              <AvatarImage
                src={representative.photo}
                alt={`${representative.name} photo`}
                className="object-cover"
                onError={() => setAvatarFailed(true)}
              />
            )}
            <AvatarFallback
              className="text-lg font-semibold text-muted-foreground"
              style={{ background: "var(--muted)" }}
            >
              {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h3 className="text-headline leading-snug text-foreground">
              {representative.name}
            </h3>

            <p className="mt-0.5 text-subheadline leading-snug text-muted-foreground">
              {getPositionLabel(representative.electedOffice)}
              {place ? ` · ${place}` : ""}
            </p>

            {(party || showLevel) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {party && <PartyBadge party={party} />}
                {showLevel && (
                  <LevelChip
                    level={representative.level}
                    electedOffice={representative.electedOffice}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="-mr-2 flex shrink-0">
          {showSaveButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              aria-label={isSaved ? `Remove ${representative.name} from saved representatives` : `Save ${representative.name}`}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              {isSaved ? (
                <Heart className="h-5 w-5 text-primary fill-current" />
              ) : (
                <Heart className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          )}
          {showDeleteButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              aria-label={`Delete ${representative.name} from saved representatives`}
              className="h-11 w-11 shrink-0 rounded-full"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* One quiet action row: call, write, read more. Each card used to stack
          three red-tinted buttons and stand 306px tall, so four results ran
          to two and a half screens of red. */}
      <div className="civic-card-actions">
        <button
          type="button"
          className="civic-card-action"
          onClick={handleCall}
          disabled={!representative.phone}
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          <span>{representative.phone ? "Call" : "No Phone"}</span>
        </button>
        <button
          type="button"
          className="civic-card-action"
          onClick={handleEmail}
          disabled={!representative.email}
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          <span>{representative.email ? "Email" : "No Email"}</span>
        </button>
        <button
          type="button"
          className="civic-card-action"
          onClick={onViewProfile}
          aria-label="View Full Profile"
        >
          <span>Profile</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </motion.article>
  );
}
