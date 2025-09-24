import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, User, MapPin, Flag, Heart, HeartOff, ExternalLink } from "lucide-react";
import type { Representative } from "@shared/schema";

interface RepresentativeCardProps {
  representative: Representative;
  onViewProfile: () => void;
  showSaveButton?: boolean;
}

export function RepresentativeCard({ 
  representative, 
  onViewProfile, 
  showSaveButton = true 
}: RepresentativeCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = "user-1"; // Simple user ID
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/representatives/${representative.id}/save`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        toast({
          title: isSaved ? "Removed from saved" : "Saved successfully",
          description: isSaved 
            ? "Representative removed from your saved list" 
            : "Representative added to your saved list",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update saved status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenSource = () => {
    if (representative.sourceUrl) {
      window.open(representative.sourceUrl, '_blank', 'noopener,noreferrer');
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
    if (party.toLowerCase().includes('liberal')) return 'bg-red-100 text-red-800';
    if (party.toLowerCase().includes('conservative')) return 'bg-blue-100 text-blue-800';
    if (party.toLowerCase().includes('ndp') || party.toLowerCase().includes('new democratic')) return 'bg-orange-100 text-orange-800';
    if (party.toLowerCase().includes('bloc')) return 'bg-cyan-100 text-cyan-800';
    if (party.toLowerCase().includes('green')) return 'bg-green-100 text-green-800';
    return 'bg-neutral-100 text-neutral-800';
  };

  return (
    <Card className="bg-white shadow-sm hover:shadow-lg active:shadow-md transition-all duration-200 active:scale-[0.98] touch-manipulation border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <Avatar className="w-18 h-18 border-3 border-white shadow-lg ring-2 ring-gray-100">
            <AvatarImage 
              src={representative.photo || undefined} 
              alt={`${representative.name} photo`} 
              className="object-cover"
              onError={(e) => {
                console.log('Avatar image failed to load:', representative.photo);
              }}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-lg">
              {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-neutral-800 leading-tight">
                {representative.name}
              </h3>
              {showSaveButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1 h-auto"
                >
                  {isSaved ? (
                    <Heart className="h-5 w-5 text-red-500 fill-current" />
                  ) : (
                    <HeartOff className="h-5 w-5 text-neutral-400" />
                  )}
                </Button>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <Flag className="h-4 w-4 mr-2 text-neutral-400" />
                <Badge variant="secondary" className={getPartyColor(representative.party)}>
                  {representative.party}
                </Badge>
              </div>
              
              <div className="flex items-center text-neutral-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{representative.constituency}</span>
              </div>
              
              <div className="flex items-center text-neutral-600">
                <User className="h-4 w-4 mr-2" />
                <span>Member of Parliament</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Actions */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm active:shadow-none"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5 mb-2" />
              <span className="text-xs font-semibold">Call</span>
            </button>
            
            <button
              className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-50 text-green-600 border border-green-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm active:shadow-none"
              onClick={handleEmail}
            >
              <Mail className="h-5 w-5 mb-2" />
              <span className="text-xs font-semibold">Email</span>
            </button>
          </div>
        </div>

        <div className="mt-3">
            <button
              className="flex w-full items-center justify-center p-4 rounded-2xl bg-gray-50 text-gray-600 border border-gray-100 active:scale-95 transition-all duration-200 touch-manipulation shadow-sm active:shadow-none"
              onClick={handleOpenSource}
            >
              <ExternalLink className="h-5 w-5 mr-2" />
              <span className="text-xs font-semibold">Open Official Source</span>
            </button>
        </div>
      </CardContent>
    </Card>
  );
}
