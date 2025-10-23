import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Clock, Heart, Info, Save, GitBranch, Loader2 } from "lucide-react";
import { Browser } from '@capacitor/browser';
import { isPlatform } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { repRepository } from "@/lib/storage/repRepository";
import { getSearchCount, subscribeActivityChanges } from "@/lib/storage/activityRepository";
import {
  APP_DISCLAIMER,
  DATA_SOURCE_SINGLE,
  OFFICIAL_LINKS,
  PRIVACY_NOTE,
  ABOUT_PARAGRAPH_1,
} from '../lib/constants/appCopy';
import { Section } from "@/components/ui/section";
import { Link } from "wouter";

const BASE_WEB_URL = "https://canadarepfinder.vercel.app";

const openExternal = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_WEB_URL}${url}`;
  if (isPlatform('capacitor')) {
    await Browser.open({ url: fullUrl });
  } else {
    window.open(fullUrl, '_blank');
  }
};

export default function Profile() {
  const { userData, isLoading, updateProfile } = useUserData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [savedRepCount, setSavedRepCount] = useState(0);
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setHomePostalCode(userData.homePostalCode || "");
    }
  }, [userData]);

  // Load saved rep count from repRepository
  useEffect(() => {
    const loadSavedCount = async () => {
      const reps = await repRepository.listSavedReps();
      setSavedRepCount(reps.length);
    };
    loadSavedCount();

    // Subscribe to saved changes
    const unsubscribe = repRepository.subscribeSavedChanges(() => {
      loadSavedCount();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load search count from activity service
  useEffect(() => {
    const loadSearchCount = async () => {
      const count = await getSearchCount();
      setSearchCount(count);
    };
    loadSearchCount();

    // Subscribe to activity changes
    const unsubscribe = subscribeActivityChanges(() => {
      loadSearchCount();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSave = () => {
    updateProfile(name, homePostalCode);
    toast({
      title: "Profile saved",
      description: "Your profile has been updated.",
    });
  };

  if (isLoading) {
    return (
      <Section className="pt-8 pb-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading profile...</p>
      </Section>
    );
  }

  if (!userData) {
    return (
      <Section className="pt-8 pb-4 text-center">
        <p className="text-destructive">Error: No user data found.</p>
      </Section>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <h2 className="text-3xl font-bold text-center">Profile</h2>
        </Section>

        {/* Edit Profile Form */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Home Postal Code</Label>
              <Input id="postalCode" value={homePostalCode} onChange={(e) => setHomePostalCode(e.target.value)} placeholder="A1A 1A1" />
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </CardContent>
          </Card>
        </Section>

        {/* User Stats */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Activity — {searchCount} searches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{searchCount}</div>
                <div className="text-sm text-muted-foreground">Searches</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{savedRepCount}</div>
                <div className="text-sm text-muted-foreground">Saved</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Last search: {userData.lastPostalCodeSearch || userData.lastNameSearch || "No recent search"}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Member since: {new Date(userData.joinDate).toLocaleDateString()}</span>
            </div>
          </CardContent>
          </Card>
        </Section>

        {/* App Information */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4 shrink-0" />
              <span>Version: 2.2.0</span>
            </div>
            <Link href="/sources-disclaimer">
              <Button variant="outline" className="w-full justify-start">
                <Info className="h-4 w-4 mr-2" />
                Sources & Disclaimers
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/privacy')}>
              <Heart className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/terms')}>
              <Info className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
          </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  );
}
