import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, User, MapPin, Flag, Heart, HeartOff } from "lucide-react";
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

  const handleCall = () => {
    if (representative.phone) {
      window.location.href = `tel:${representative.phone}`;
    } else {
      toast({
        title: "No phone number",
        description: "Phone number not available for this representative",
        variant: "destructive",
      });
    }
  };

  const handleEmail = () => {
    if (representative.email) {
      window.location.href = `mailto:${representative.email}`;
    } else {
      toast({
        title: "No email address",
        description: "Email address not available for this representative",
        variant: "destructive",
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16 border-2 border-neutral-200">
            <AvatarImage 
              src={representative.photo || undefined} 
              alt={`${representative.name} photo`} 
            />
            <AvatarFallback>
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
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center justify-center p-3 h-auto"
              onClick={handleCall}
              disabled={!representative.phone}
            >
              <Phone className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-medium">Call</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center justify-center p-3 h-auto"
              onClick={handleEmail}
              disabled={!representative.email}
            >
              <Mail className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-medium">Email</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center justify-center p-3 h-auto"
              onClick={onViewProfile}
            >
              <User className="h-4 w-4 text-primary mb-1" />
              <span className="text-xs font-medium">Profile</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
