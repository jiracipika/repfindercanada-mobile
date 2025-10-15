import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, User, MapPin, Flag, Heart, ExternalLink, Trash2 } from "lucide-react";
import type { Representative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { useState, useEffect } from "react";

interface RepresentativeCardProps {
  representative: Representative;
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
    const phoneNumber = representative.phone || '1-613-992-4501'; // Legislature office default
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleEmail = () => {
    const email = representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`;
    window.open(`mailto:${email}`, '_self');
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
    <Card className="rounded-xl border bg-card shadow-sm p-4 mb-3 transition-all hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-start space-x-4">
          <Avatar className="!w-16 !h-16 border-2 border-border shadow-sm">
            <AvatarImage
              src={representative.photo || undefined}
              alt={`${representative.name} photo`}
              className="object-cover"
              onError={(e) => {
                console.log('Avatar image failed to load:', representative.photo);
              }}
            />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold text-lg">
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
                    size="sm"
                    onClick={handleSave}
                    className="p-1 h-auto"
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
                    size="sm"
                    onClick={handleDelete}
                    className="p-1 h-auto"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                <Badge variant="secondary" className={getPartyColor(representative.party)}>
                  {representative.party}
                </Badge>
              </div>

              <div className="flex items-center text-muted-foreground">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{representative.constituency}</span>
              </div>

              <div className="flex items-center text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
                <span>{getPositionLabel(representative.electedOffice)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="mt-5 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-4 h-auto rounded-xl"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Call</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-4 h-auto rounded-xl"
              onClick={handleEmail}
            >
              <Mail className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Email</span>
            </Button>
          </div>
        </div>

        <div className="mt-3">
            <Button
              variant="outline"
              className="flex w-full items-center justify-center p-3 h-auto rounded-xl"
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