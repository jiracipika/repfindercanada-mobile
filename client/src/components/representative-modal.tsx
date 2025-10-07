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

  // Parse offices from the representative data
  const offices = representative.offices as any[] || [];
  const socialMedia = representative.socialMedia as any || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 h-[90vh] flex flex-col rounded-2xl safe-pb p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>Representative Details</DialogTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleSave}
            >
              {isSaved ? (
                <Heart className="h-4 w-4 text-red-500 fill-current" />
              ) : (
                <Heart className="h-4 w-4" />
              )}
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={handleMap}
            >
              <Map className="h-4 w-4" />
              Map
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto overflow-x-hidden px-6 pb-6 flex-1 w-full min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Profile Section with Header */}
          <Card className="min-w-0">
            <CardContent className="space-y-6 min-w-0 pt-6">
              {/* Avatar and Basic Info - Centered */}
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-background shadow-lg">
                  <AvatarImage
                    src={representative.photo || undefined}
                    alt={`${representative.name} photo`}
                    className="object-cover"
                    onError={(e) => {
                      console.log('Modal avatar image failed to load:', representative.photo);
                    }}
                  />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                    {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <h2 className="text-2xl font-bold text-foreground mb-2 break-words">{representative.name}</h2>
                <p className="text-sm text-muted-foreground mb-3">Member of Parliament</p>

                <Badge variant="secondary" className={`${getPartyColor(representative.party)} mb-4`}>
                  {representative.party}
                </Badge>

                <div className="flex items-center text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{representative.constituency}, {representative.province}</span>
                </div>
              </div>

              <Separator />

              {/* Quick Contact Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleCall(representative.phone || '1 613 992-4501')}
                  className="w-full"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleEmail(representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`)}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>

              {/* Contact Details */}
              <div className="space-y-3 text-sm flex flex-col items-center">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                  >
                    {representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`}
                  </a>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    {representative.phone || '1-613-992-4501'}
                  </span>
                </div>

                {representative.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={representative.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                    >
                      Official Website
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card className="min-w-0">
            <CardHeader>
              <h3 className="text-lg font-semibold">About</h3>
            </CardHeader>
            <CardContent className="min-w-0">
              <p className="text-sm text-gray-600 whitespace-pre-line break-words">
                {representative.biography || `${representative.name} is the Member of Parliament for ${representative.constituency}, representing the ${representative.party} party.`}
              </p>
            </CardContent>
          </Card>

          {/* Interactive Map Section */}
          <Card className="min-w-0">
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Map className="h-5 w-5" />
                Office Locations
              </h3>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4">
              <div className="w-full h-48 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 rounded-xl border border-border flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_var(--tw-gradient-from)_100%)]"></div>
                <div className="text-center z-10">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Office Locations</p>
                  <p className="text-xs text-muted-foreground">Click buttons below to view on map</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMap}
                  className="flex-1"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Both Offices
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(representative.constituency + ', ' + representative.province + ', Canada')}`, '_blank')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Constituency
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offices Section */}
          <Card className="min-w-0">
            <CardHeader>
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </CardHeader>
            <CardContent className="space-y-4 min-w-0">
              {/* Legislature Office */}
              <div className="border rounded-lg p-4 min-w-0">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Legislature Office
                </h4>

                <p className="text-sm text-gray-600 mb-2 break-words">House of Commons Ottawa ON K1A 0A6</p>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                    <button
                      onClick={() => handleCall('1 613 992-4501')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 px-2 py-1 rounded"
                    >
                      1 613 992-4501
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 min-w-0">
                    <Printer className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm break-words">Fax: 1 613 992-4501</span>
                  </div>
                </div>
              </div>

              {/* Constituency Office */}
              <div className="border rounded-lg p-4 min-w-0">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Constituency Office
                </h4>

                <p className="text-sm text-gray-600 mb-2 break-words">
                  Main office - {representative.constituency}<br/>
                  Sheppard avenue East {representative.constituency}<br/>
                  M1T 3K1
                </p>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Phone className="h-4 w-4 text-blue-600 shrink-0" />
                    <button
                      onClick={() => handleCall('1 416 321-5454')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 px-2 py-1 rounded"
                    >
                      1 416 321-5454
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 min-w-0">
                    <Printer className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm break-words">Fax: 1 416 321-5456</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Official Profile Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => representative.website && handleWebsite(representative.website)}
            disabled={!representative.website}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Official Profile
          </Button>
        </div>

        <DialogFooter className="bg-background border-t px-6 py-4 shrink-0">
          <SafeArea bottom className="w-full">
            <Button
              className="w-full h-12 text-base"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : isSaved ? (
                <Heart className="h-5 w-5 mr-2 fill-current" />
              ) : (
                <Heart className="h-5 w-5 mr-2" />
              )}
              {isSaved ? "Unsave Representative" : "Save Representative"}
            </Button>
          </SafeArea>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}