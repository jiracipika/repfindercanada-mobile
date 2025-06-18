import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, ExternalLink, Globe } from "lucide-react";
import type { Representative } from "@shared/schema";

interface RepresentativeModalProps {
  representative: Representative;
  isOpen: boolean;
  onClose: () => void;
}

export function RepresentativeModal({ representative, isOpen, onClose }: RepresentativeModalProps) {
  const handleCall = () => {
    if (representative.phone) {
      window.location.href = `tel:${representative.phone}`;
    }
  };

  const handleEmail = () => {
    if (representative.email) {
      window.location.href = `mailto:${representative.email}`;
    }
  };

  const handleWebsite = () => {
    if (representative.website) {
      window.open(representative.website, '_blank');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Representative Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Representative Info */}
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-3 border-4 border-neutral-200">
              <AvatarImage 
                src={representative.photo || undefined} 
                alt={`${representative.name} photo`} 
              />
              <AvatarFallback className="text-lg">
                {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">
              {representative.name}
            </h3>
            
            <Badge variant="secondary" className={getPartyColor(representative.party)}>
              {representative.party}
            </Badge>
          </div>
          
          {/* Contact Information */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-neutral-800 mb-3">Contact Information</h4>
              <div className="space-y-3">
                {representative.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-primary" />
                    <span className="text-sm">{representative.phone}</span>
                  </div>
                )}
                
                {representative.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <span className="text-sm break-all">{representative.email}</span>
                  </div>
                )}
                
                {representative.website && (
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="text-sm break-all">{representative.website}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Constituency Info */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-neutral-800 mb-3">Constituency</h4>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="text-sm">{representative.constituency}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button 
            className="w-full"
            onClick={handleCall}
            disabled={!representative.phone}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call Now
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleEmail}
            disabled={!representative.email}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
        </div>
        
        {representative.website && (
          <Button 
            variant="outline" 
            className="w-full mt-2"
            onClick={handleWebsite}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Website
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
