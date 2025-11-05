import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Preferences } from "@capacitor/preferences";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import Activity from "@/pages/activity";
import NotFound from "@/pages/not-found";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SafeArea } from "@/components/ui/safe-area";
import LoadingScreen from "@/components/loading-screen";
import TermsModal from "@/components/terms-modal";
import NonAffiliationModal from "@/components/non-affiliation-modal";
import { UserDataProvider, useUserData } from "@/hooks/use-user-data";
import { SwipePager } from "@/components/SwipePager";
import AppHeader from "@/components/app-header";

import { SourcesDisclaimer } from "@/pages/sources-disclaimer";
import NameSearch from "@/pages/name-search";

// Map routes to page indices
const routeToIndex: Record<string, number> = {
  '/': 0,
  '/saved': 1,
  '/activity': 2,
  '/profile': 3,
};

const indexToRoute = ['/', '/saved', '/activity', '/profile'];

function Router() {
  const [location, setLocation] = useLocation();

  // Handle special routes that aren't part of the main pager
  if (location === '/sources-disclaimer') {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <div className="flex-1 flex flex-col overflow-hidden">
          <SourcesDisclaimer />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (location === '/name-search') {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <AppHeader />
        <div className="flex-1 flex flex-col overflow-hidden">
          <NameSearch />
        </div>
        <BottomNav />
      </div>
    );
  }

  // Get current page index from route
  const currentIndex = routeToIndex[location] ?? 0;

  const handleIndexChange = (newIndex: number) => {
    setLocation(indexToRoute[newIndex]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <AppHeader />
      <div className="flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
        <SwipePager
          pages={[
            <Home key="home" />,
            <Saved key="saved" />,
            <Activity key="activity" />,
            <Profile key="profile" />
          ]}
          currentIndex={currentIndex}
          onIndexChange={handleIndexChange}
          className="flex-1"
        />
      </div>
      <BottomNav />
    </div>
  );
}

const TERMS_KEY = 'termsAcceptedVersion';

function AppContent() {
  const [appStatus, setAppStatus] = useState('initializing'); // 'initializing', 'needsTerms', 'needsDisclaimer', 'ready'
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  const { initializeUserData, isLoading: userDataLoading } = useUserData();

  useEffect(() => {
    // Don't start startup sequence until user data is loaded
    if (userDataLoading) {
      console.log('[Startup] Waiting for user data to load...');
      return;
    }

    const startup = async () => {
      console.log('[Startup] === App Startup Sequence Started ===');
      try {
        // Initialize StatusBar for native platforms
        if (Capacitor.isNativePlatform()) {
          console.log('[Startup] Initializing StatusBar for native platform');
          await StatusBar.setStyle({ style: Style.Light }); // Or Dark, depending on theme
          await StatusBar.setOverlaysWebView({ overlay: true });
        }

        // Get current app version
        const info = await CapApp.getInfo();
        const currentVersion = info.version ?? '0.0.0';
        setAppVersion(currentVersion);
        console.log('[Startup] Current app version:', currentVersion);

        // Check if terms were accepted for this version
        const result = await Preferences.get({ key: TERMS_KEY });
        const termsAcceptedVersion = result?.value || null;
        console.log('[Startup] Preferences.get result:', JSON.stringify(result));
        console.log('[Startup] Terms accepted for version:', termsAcceptedVersion);
        console.log('[Startup] Terms value type:', typeof termsAcceptedVersion);
        console.log('[Startup] Terms is null?:', termsAcceptedVersion === null);
        console.log('[Startup] Terms is empty string?:', termsAcceptedVersion === '');

        // Need to show terms if: never accepted OR accepted for different version
        const needsTerms = !termsAcceptedVersion || termsAcceptedVersion !== currentVersion;
        console.log('[Startup] Does user need to accept terms?', needsTerms);
        console.log('[Startup] Reason: !termsAcceptedVersion?', !termsAcceptedVersion, ', version mismatch?', termsAcceptedVersion !== currentVersion);

        if (needsTerms) {
          console.log('[Startup] --> SHOWING TERMS MODAL for version', currentVersion);
          setAppStatus('needsTerms');
          return;
        }

        // Terms are accepted for current version, show disclaimer on every launch
        console.log('[Startup] --> SHOWING DISCLAIMER (terms already accepted)');
        setAppStatus('needsDisclaimer');
      } catch (error) {
        console.error('[Startup] !!! Error during startup:', error);
        console.error('[Startup] !!! Falling back to showing terms');
        setAppStatus('needsTerms'); // Fallback to showing terms on error
      }
    };

    startup();
  }, [userDataLoading]);

  const handleAcceptPrivacyPolicy = async () => {
    console.log('[Startup] === User Accepted Privacy Policy ===');
    console.log('[Startup] Saving acceptance for version:', appVersion);
    try {
      await Preferences.set({ key: TERMS_KEY, value: appVersion });
      console.log('[Startup] Successfully saved terms acceptance');

      // Verify it was saved
      const verification = await Preferences.get({ key: TERMS_KEY });
      console.log('[Startup] Verification - saved value:', verification?.value);

      initializeUserData();
      console.log('[Startup] User data initialized');
      console.log('[Startup] Transitioning to disclaimer...');
      setAppStatus('needsDisclaimer');
    } catch (error) {
      console.error('[Startup] Error saving terms acceptance:', error);
    }
  };

  const handleAcknowledgeDisclaimer = async () => {
    console.log('[Startup] === User Acknowledged Disclaimer ===');
    console.log('[Startup] App is now ready');
    setAppStatus('ready');
  };

  if (appStatus === 'initializing') {
    return <LoadingScreen />;
  }

  if (appStatus === 'needsTerms') {
    return <TermsModal onAccept={handleAcceptPrivacyPolicy} />;
  }

  if (appStatus === 'needsDisclaimer') {
    return <NonAffiliationModal onAcknowledge={handleAcknowledgeDisclaimer} />;}

  return <Router />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserDataProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </UserDataProvider>
    </QueryClientProvider>
  );
}
