import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, MapPin, ExternalLink, Globe, Building2, Printer, Heart } from "lucide-react";
import type { Representative } from "@shared/schema";

interface RepresentativeModalProps {
  representative: Representative;
  isOpen: boolean;
  onClose: () => void;
}

export function RepresentativeModal({ representative, isOpen, onClose }: RepresentativeModalProps) {
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleWebsite = (url: string) => {
    window.open(url, '_blank');
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
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Find Representatives</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => {/* TODO: Implement save functionality */}}
          >
            <Heart className="h-4 w-4" />
            Follow
          </Button>
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
                  />
                  <AvatarFallback className="text-lg">
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
                  <Mail className="h-5 w-5 text-primary" />
                  <button 
                    onClick={() => handleEmail(`${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`)}
                    className="text-sm text-primary hover:underline"
                  >
                    {`${representative.name.toLowerCase().replace(/\s+/g, '.')}@parl.gc.ca`}
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <button 
                    onClick={() => handleCall('1 613 992-4501')}
                    className="text-sm text-primary hover:underline"
                  >
                    1 613 992-4501
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <button 
                    onClick={() => handleWebsite(representative.website || 'https://openparliament.ca')}
                    className="text-sm text-primary hover:underline break-all"
                  >
                    Official Website
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <button 
                    onClick={() => handleWebsite('https://www.ourcommons.ca/members/en')}
                    className="text-sm text-primary hover:underline"
                  >
                    Personal Website
                  </button>
                </div>
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
              <p className="text-sm text-gray-600">
                {representative.biography || 'No biography available for this representative.'}
              </p>
            </CardContent>
          </Card>

          {/* Offices Section */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Offices</h3>
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
                    <Phone className="h-4 w-4 text-primary" />
                    <button 
                      onClick={() => handleCall('1 613 992-4501')}
                      className="text-sm text-primary hover:underline"
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
                    <Phone className="h-4 w-4 text-primary" />
                    <button 
                      onClick={() => handleCall('1 416 321-5454')}
                      className="text-sm text-primary hover:underline"
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
      </DialogContent>
    </Dialog>
  );
}
