import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Clock, Heart, Info } from "lucide-react";

export default function Profile() {
  // Simple user data - in a real app, this would come from authentication
  const userData = {
    location: "Ottawa, ON",
    searchCount: 12,
    savedCount: 3,
    joinDate: "2024-01-15"
  };

  return (
    <div className="space-y-6 p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">Profile</h2>
        <p className="text-neutral-600 text-sm">Manage your Find My Rep preferences</p>
      </div>

      {/* User Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Your Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{userData.searchCount}</div>
              <div className="text-sm text-neutral-600">Searches</div>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{userData.savedCount}</div>
              <div className="text-sm text-neutral-600">Saved</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="h-4 w-4" />
            <span>Last search: {userData.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Clock className="h-4 w-4" />
            <span>Member since: {new Date(userData.joinDate).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Find My Rep
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            Find My Rep helps Canadians discover and connect with their Parliamentary representatives 
            using official data from OpenParliament.ca.
          </p>
          
          <div className="space-y-2">
            <Badge variant="secondary" className="mr-2">Version 1.0.0</Badge>
            <Badge variant="outline">PWA Ready</Badge>
          </div>
          
          <div className="pt-4 space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Heart className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Info className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PWA Install Prompt */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="text-primary text-2xl">📱</div>
            <h3 className="font-semibold text-neutral-800">Install Find My Rep</h3>
            <p className="text-sm text-neutral-600">
              Add this app to your home screen for quick access to your representatives.
            </p>
            <Button className="w-full">
              Install App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
