import { useUserData } from "@/hooks/use-user-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Clock, Heart, Info } from "lucide-react";
import { Browser } from '@capacitor/browser';
import { isPlatform } from '@ionic/react';
import {
  APP_DISCLAIMER,
  DATA_SOURCE_SINGLE,
  OFFICIAL_LINKS,
  PRIVACY_NOTE,
  ABOUT_PARAGRAPH_1,
} from '../lib/constants/appCopy';

const openExternal = async (url: string) => {
  if (isPlatform('capacitor')) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};

export default function Profile() {
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!userData) {
    return <div>No user data found.</div>; // Or some other fallback UI
  }

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
              <div className="text-2xl font-bold text-primary">{userData.savedReps.length}</div>
              <div className="text-sm text-neutral-600">Saved</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="h-4 w-4" />
            <span>Last search: {userData.lastSearch}</span>
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
            {ABOUT_PARAGRAPH_1}
          </p>

          <h3 className="font-semibold text-neutral-800">Disclaimer:</h3>
          <p className="text-sm text-neutral-600">{APP_DISCLAIMER}</p>

          <h3 className="font-semibold text-neutral-800">Data Source:</h3>
          <p className="text-sm text-neutral-600">
            {DATA_SOURCE_SINGLE.split('—')[0]}—{' '}
            <a href="#" onClick={() => openExternal('https://represent.opennorth.ca/')} className="text-blue-600 hover:underline">
              https://represent.opennorth.ca/
            </a>
          </p>

          <h3 className="font-semibold text-neutral-800">Official Source Links (verification only):</h3>
          <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
            <li>
              House of Commons – Members (MPs):{' '}
              <a href="#" onClick={() => openExternal(OFFICIAL_LINKS.HOUSE_OF_COMMONS)} className="text-blue-600 hover:underline">
                {OFFICIAL_LINKS.HOUSE_OF_COMMONS}
              </a>
            </li>
            <li>
              Senate of Canada – Senators:{' '}
              <a href="#" onClick={() => openExternal(OFFICIAL_LINKS.SENATE_OF_CANADA)} className="text-blue-600 hover:underline">
                {OFFICIAL_LINKS.SENATE_OF_CANADA}
              </a>
            </li>
            <li>
              Elections Canada – Find your electoral district:{' '}
              <a href="#" onClick={() => openExternal(OFFICIAL_LINKS.ELECTIONS_CANADA)} className="text-blue-600 hover:underline">
                {OFFICIAL_LINKS.ELECTIONS_CANADA}
              </a>
            </li>
          </ul>

          <h3 className="font-semibold text-neutral-800">Privacy Note:</h3>
          <p className="text-sm text-neutral-600">{PRIVACY_NOTE}</p>
          
          <div className="space-y-2">
            <Badge variant="secondary" className="mr-2">Version 1.0.0</Badge>
            <Badge variant="outline">PWA Ready</Badge>
          </div>
          
          <div className="pt-4 space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/privacy-policy.html')}>
              <Heart className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/sources-disclaimer')}>
              <Info className="h-4 w-4 mr-2" />
              Sources & Disclaimers
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/terms')}>
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
