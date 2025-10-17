import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, ExternalLink, Globe, Building2, Printer, Heart, Share2, Map, Loader2 } from "lucide-react";
import type { Representative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { SafeArea } from "@/components/ui/safe-area";

interface RepresentativeModalProps {
  representative: Representative;
  isOpen: boolean;
  onClose: () => void;
}

export function RepresentativeModal({ representative, isOpen, onClose }: RepresentativeModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSavedStatus = async () => {
      const saved = await repRepository.isSaved(representative.id);
      setIsSaved(saved);
    };

    if (isOpen) {
      checkSavedStatus();

      // Subscribe to saved changes to update status in real-time
      const unsubscribe = repRepository.subscribeSavedChanges(() => {
        checkSavedStatus();
      });

      return () => unsubscribe();
    }
  }, [representative.id, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handleWebsite = (url: string) => {
    window.open(url, '_blank');
  };

  const handleMap = () => {
    const ottawaAddress = `House of Commons, Ottawa, ON, Canada`;
    const constituencyAddress = `${representative.constituency}, ${representative.province}, Canada`;
    
    // Open multiple maps showing both office locations
    const ottawaUrl = `https://maps.google.com/maps?q=${encodeURIComponent(ottawaAddress)}`;
    const constituencyUrl = `https://maps.google.com/maps?q=${encodeURIComponent(constituencyAddress)}`;
    
    // Create a combined view showing both locations
    const combinedUrl = `https://maps.google.com/maps/dir/${encodeURIComponent(ottawaAddress)}/${encodeURIComponent(constituencyAddress)}`;
    
    window.open(combinedUrl, '_blank');
  };

  const handleShare = () => {
    const shareText = `Contact ${representative.name} - ${representative.party} MP for ${representative.constituency}, ${representative.province}\n\nLegislature Office: 1-613-992-4501\nConstituency Office: 1-416-321-5454\nEmail: ${representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}
@parl.gc.ca`}\n\nFind your MP at: ${window.location.href}`;

    if (navigator.share) {
      navigator.share({
        title: `Contact ${representative.name}`,
        text: shareText,
        url: window.location.href
      }).catch(() => {
        // Fallback if native sharing fails
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Contact information copied to clipboard!');
        });
      });
    } else {
      // Social media sharing options
      const encodedText = encodeURIComponent(shareText);
      const encodedUrl = encodeURIComponent(window.location.href);
      
      // Show sharing options (simplified - just copy to clipboard for now)
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Contact information copied to clipboard! You can now paste it anywhere to share.');
      });
    }
  };

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('liberal')) return 'bg-red-100 text-red-800';
    if (party.toLowerCase().includes('conservative')) return 'bg-blue-100 text-blue-800';
    if (party.toLowerCase().includes('ndp') || party.toLowerCase().includes('new democratic')) return 'bg-orange-100 text-orange-800';
    if (party.toLowerCase().includes('bloc')) return 'bg-cyan-100 text-cyan-800';
    if (party.toLowerCase().includes('green')) return 'bg-green-100 text-green-800';
    return 'bg-neutral-100 text-neutral-800';
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

  const getAboutText = () => {
    if (representative.biography) {
      return representative.biography;
    }

    const position = getPositionLabel(representative.electedOffice);
    const level = representative.electedOffice?.toLowerCase() === 'mp' ? 'federal' :
                  (representative.electedOffice?.toLowerCase() === 'mpp' ||
                   representative.electedOffice?.toLowerCase() === 'mla' ||
                   representative.electedOffice?.toLowerCase() === 'mna') ? 'provincial' : 'municipal';

    const hasParty = representative.party && representative.party.toLowerCase() !== 'independent';
    const partyText = hasParty ? ` of the ${representative.party}` : '';

    return `${representative.name} serves as the ${position} for ${representative.constituency}${representative.province ? ', ' + representative.province : ''}. As a ${level} representative${partyText}, they work to address the needs and concerns of their constituents.`;
  };

  // Parse offices from the representative data
  const offices = representative.offices as any[] || [];
  const socialMedia = representative.socialMedia as any || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        {/* Header - Responsive */}
        <DialogHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0 border-b">
          <DialogTitle className="text-lg sm:text-xl">Representative Details</DialogTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              ) : isSaved ? (
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 fill-current" />
              ) : (
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              onClick={handleMap}
            >
              <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Map</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-4 sm:space-y-5 px-4 sm:px-6 py-4 sm:py-5">
            {/* Profile Section */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                {/* Avatar and Basic Info - Centered */}
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4 border-2 sm:border-4 border-background shadow-lg">
                    <AvatarImage
                      src={representative.photo || undefined}
                      alt={`${representative.name} photo`}
                      className="object-cover"
                      onError={(e) => {
                        console.log('Modal avatar image failed to load:', representative.photo);
                      }}
                    />
                    <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                      {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1 sm:mb-2 break-words px-2">{representative.name}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">{getPositionLabel(representative.electedOffice)}</p>

                  {representative.party && representative.party.toLowerCase() !== 'independent' && (
                    <Badge variant="secondary" className={`${getPartyColor(representative.party)} mb-3 sm:mb-4 text-xs sm:text-sm`}>
                      {representative.party}
                    </Badge>
                  )}

                  <div className="flex items-center justify-center text-muted-foreground text-xs sm:text-sm px-2">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    <span className="break-words text-center">{representative.constituency}, {representative.province}</span>
                  </div>
                </div>

                <Separator className="my-4 sm:my-5" />

                {/* Quick Contact Actions */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-5">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => handleCall(representative.phone || '1 613 992-4501')}
                    className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <Phone className="h-4 w-4 mr-1.5 sm:mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => handleEmail(representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`)}
                    className="w-full h-10 sm:h-11 text-sm sm:text-base"
                  >
                    <Mail className="h-4 w-4 mr-1.5 sm:mr-2" />
                    Email
                  </Button>
                </div>

                {/* Contact Details */}
                <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <a
                      href={`mailto:${representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                    >
                      {representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`}
                    </a>
                  </div>

                  <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground flex-1">
                      {representative.phone || '1-613-992-4501'}
                    </span>
                  </div>

                  {representative.website && (
                    <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-lg bg-muted/50">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <a
                        href={representative.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline break-all flex-1"
                      >
                        Official Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader className="p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold">About</h3>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line break-words leading-relaxed">
                  {getAboutText()}
                </p>
              </CardContent>
            </Card>

            {/* Interactive Map Section */}
            <Card>
              <CardHeader className="p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Map className="h-4 w-4 sm:h-5 sm:w-5" />
                  Office Locations
                </h3>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 rounded-lg sm:rounded-xl border border-border flex items-center justify-center overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_var(--tw-gradient-from)_100%)]"></div>
                  <div className="text-center z-10 px-4">
                    <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-medium text-foreground">Office Locations</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Click buttons below to view on map</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMap}
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Both Offices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(representative.constituency + ', ' + representative.province + ', Canada')}`, '_blank')}
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Constituency
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Offices Section */}
            <Card>
              <CardHeader className="p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold">Contact Information</h3>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                {/* Legislature Office */}
                <div className="border rounded-lg p-3 sm:p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Building2 className="h-4 w-4 shrink-0" />
                    Legislature Office
                  </h4>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 break-words leading-relaxed">
                    House of Commons<br/>
                    Ottawa ON K1A 0A6
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                      <button
                        onClick={() => handleCall('1 613 992-4501')}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded"
                      >
                        1 613 992-4501
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">Fax: 1 613 992-4501</span>
                    </div>
                  </div>
                </div>

                {/* Constituency Office */}
                <div className="border rounded-lg p-3 sm:p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Building2 className="h-4 w-4 shrink-0" />
                    Constituency Office
                  </h4>

                  <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 break-words leading-relaxed">
                    Main office - {representative.constituency}<br/>
                    Sheppard Avenue East<br/>
                    {representative.constituency}<br/>
                    M1T 3K1
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 shrink-0" />
                      <button
                        onClick={() => handleCall('1 416 321-5454')}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded"
                      >
                        1 416 321-5454
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground">Fax: 1 416 321-5456</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Official Profile Button */}
            <Button
              variant="outline"
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
              onClick={() => representative.website && handleWebsite(representative.website)}
              disabled={!representative.website}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Official Profile
            </Button>
          </div>
        </div>

        {/* Footer with Save Action */}
        <DialogFooter className="bg-background border-t px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <SafeArea bottom className="w-full">
            <Button
              className="w-full h-11 sm:h-12 text-sm sm:text-base"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
              ) : isSaved ? (
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2 fill-current" />
              ) : (
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              )}
              {isSaved ? "Unsave Representative" : "Save Representative"}
            </Button>
          </SafeArea>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}