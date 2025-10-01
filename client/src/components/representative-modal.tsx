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
      const saved = await repRepository.isSaved(String(representative.id));
      setIsSaved(saved);
    };
    if (isOpen) {
      checkSavedStatus();
    }
  }, [representative.id, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isSaved) {
        await repRepository.removeRep(String(representative.id));
        setIsSaved(false);
        toast({
          title: "Removed from saved",
          description: "Representative removed from your saved list",
        });
      } else {
        await repRepository.saveRep(representative);
        setIsSaved(true);
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
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl safe-pb">
        <DialogHeader className="flex flex-row items-center justify-between">
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
        
        <div className="space-y-6">
          {/* Representative Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{representative.name}</h2>
            <p className="text-gray-600 dark:text-gray-400">MP</p>
          </div>

          {/* Profile Section */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Profile</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar and Basic Info */}
              <div className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarImage 
                    src={representative.photo || undefined} 
                    alt={`${representative.name} photo`} 
                    className="object-cover"
                    onError={(e) => {
                      console.log('Modal avatar image failed to load:', representative.photo);
                    }}
                  />
                  <AvatarFallback className="text-lg bg-blue-500 text-white font-semibold">
                    {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                
                <Badge variant="secondary" className={getPartyColor(representative.party)}>
                  {representative.party}
                </Badge>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-sm">{representative.constituency}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <button 
                    onClick={() => handleEmail(representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}
@parl.gc.ca`)}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                  >
                    {representative.email || `${representative.name.toLowerCase().replace(/\s+/g, '.')}
@parl.gc.ca`}
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <button 
                    onClick={() => handleCall(representative.phone || '1 613 992-4501')}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                  >
                    {representative.phone || '1 613 992-4501'}
                  </button>
                </div>

                {representative.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <a 
                      href={representative.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      Official Website
                    </a>
                  </div>
                )}

                {representative.personalWebsite && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <a 
                      href={representative.personalWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Personal Website
                    </a>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {Object.keys(socialMedia).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Social Media</h4>
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-primary" />
                      {/* Social media links would go here */}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">About</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {representative.biography || `${representative.name} is the Member of Parliament for ${representative.constituency}, representing the ${representative.party} party.`}
              </p>
            </CardContent>
          </Card>

          {/* Interactive Map Section */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Map className="h-5 w-5" />
                Office Locations
              </h3>
            </CardHeader>
            <CardContent>
              <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Interactive Map</p>
                  <p className="text-xs text-gray-500">Click buttons below to view locations</p>
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
                  View Both Offices
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(representative.constituency + ', ' + representative.province + ', Canada')}`, '_blank')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Constituency Office
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offices Section */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Legislature Office */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Legislature Office
                </h4>
                
                <p className="text-sm text-gray-600 mb-2">House of Commons Ottawa ON K1A 0A6</p>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <button 
                      onClick={() => handleCall('1 613 992-4501')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 px-2 py-1 rounded"
                    >
                      1 613 992-4501
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Printer className="h-4 w-4 text-primary" />
                    <span className="text-sm">Fax: 1 613 992-4501</span>
                  </div>
                </div>
              </div>

              {/* Constituency Office */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Constituency Office
                </h4>
                
                <p className="text-sm text-gray-600 mb-2">
                  Main office - {representative.constituency}<br/>
                  Sheppard avenue East {representative.constituency}<br/>
                  M1T 3K1
                </p>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <button 
                      onClick={() => handleCall('1 416 321-5454')}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium bg-blue-50 px-2 py-1 rounded"
                    >
                      1 416 321-5454
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Printer className="h-4 w-4 text-primary" />
                    <span className="text-sm">Fax: 1 416 321-5456</span>
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

        <DialogFooter className="bg-background border-t p-4 sticky bottom-0">
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