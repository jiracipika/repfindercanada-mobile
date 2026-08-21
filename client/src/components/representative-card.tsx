import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, User, MapPin, Flag, Heart, ExternalLink, Trash2 } from "lucide-react";
import type { ApiRepresentative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { useState, useEffect } from "react";

interface RepresentativeCardProps {
  representative: ApiRepresentative;
  onViewProfile: () => void;
  showSaveButton?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

export function RepresentativeCard({
  representative,
  onViewProfile,
  showSaveButton = true,
  showDeleteButton = false,
  onDelete
}: RepresentativeCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const { toast } = useToast();

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

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('liberal')) return 'bg-red-500/10 text-red-600 dark:text-red-400';
    if (party.toLowerCase().includes('conservative')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (party.toLowerCase().includes('ndp') || party.toLowerCase().includes('new democratic')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
    if (party.toLowerCase().includes('bloc')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';
    if (party.toLowerCase().includes('green')) return 'bg-green-500/10 text-green-600 dark:text-green-400';
    return 'bg-muted text-muted-foreground';
  };

  const getPositionLabel = (electedOffice?: string | null) => {
    if (!electedOffice) return 'Representative';

    const office = electedOffice.toLowerCase();

    // Federal
    if (office === 'mp') return 'Member of Parliament';

    // Provincial
    if (office === 'mla') return 'Member of Legislative Assembly';
    if (office === 'mpp') return 'Member of Provincial Parliament';
    if (office === 'mna') return 'Member of National Assembly';

    // Municipal
    if (office === 'mayor') return 'Mayor';
    if (office === 'councillor') return 'City Councillor';
    if (office.includes('councillor')) return 'Councillor';
    if (office.includes('councilor')) return 'Councilor';

    // Default: capitalize first letter of each word
    return electedOffice.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card data-civic-card="true" className="mb-3 overflow-hidden border-0 bg-transparent p-4 shadow-none transition-transform active:scale-[.995]">
      <CardContent className="p-0">
        <div className="flex items-start space-x-4">
          <Avatar className="!h-16 !w-16 border-2 border-[color:var(--civic-blue)]/40 shadow-lg">
            <AvatarImage
              src={representative.photo || undefined}
              alt={`${representative.name} photo`}
              className="object-cover"
              onError={(e) => {
                console.log('Avatar image failed to load:', representative.photo);
                // Set to empty string to show fallback when image fails
                (e.target as HTMLImageElement).src = '';
              }}
            />
            <AvatarFallback className="bg-gradient-to-br from-[var(--civic-blue)] to-[var(--civic-mint)] text-neutral-900 font-bold text-lg">
              {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-foreground leading-tight">
                {representative.name}
              </h3>
              <div className="flex gap-1">
                {showSaveButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSave}
                    aria-label={isSaved ? `Remove ${representative.name} from saved representatives` : `Save ${representative.name}`}
                    className="h-11 w-11 rounded-full border border-border bg-background/40"
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
                    className="h-11 w-11 rounded-full border border-border bg-background/40"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              {representative.party && representative.party.toLowerCase() !== 'independent' && (
                <div className="flex items-center">
                  <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                  <Badge variant="secondary" className={getPartyColor(representative.party)}>
                    {representative.party}
                  </Badge>
                </div>
              )}

              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{representative.constituency || representative.riding || 'No constituency information'}</span>
                {representative.level && (
                  <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                    {representative.level === 'federal' ? 'Federal' :
                     representative.level === 'provincial' ? 'Provincial' : 'Municipal'}
                  </span>
                )}
              </div>

              <div className="flex items-center text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
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
              className={`min-h-14 rounded-xl border-border bg-background/35 font-bold ${!representative.phone ? 'opacity-50' : ''}`}
              onClick={handleCall}
              disabled={!representative.phone}
            >
              <Phone className="mr-2 h-4 w-4" />
              <span className="text-sm font-bold">
                {representative.phone ? 'Call' : 'No Phone'}
              </span>
            </Button>

            <Button
              variant="outline"
              className={`min-h-14 rounded-xl border-border bg-background/35 font-bold ${!representative.email ? 'opacity-50' : ''}`}
              onClick={handleEmail}
              disabled={!representative.email}
            >
              <Mail className="mr-2 h-4 w-4" />
              <span className="text-sm font-bold">
                {representative.email ? 'Email' : 'No Email'}
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
              <User className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">View Full Profile</span>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}