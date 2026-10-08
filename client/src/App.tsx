import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig, AnimatePresence } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
import { App as CapApp } from "@capacitor/app";
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import Activity from "@/pages/activity";
import { BottomNav } from "@/components/ui/bottom-nav";
import { SafeArea } from "@/components/ui/safe-area";
import LoadingScreen from "@/components/loading-screen";
import TermsModal from "@/components/terms-modal";
import NonAffiliationModal from "@/components/non-affiliation-modal";
import { UserDataProvider, useUserData } from "@/hooks/use-user-data";
import { SearchStateProvider } from "@/hooks/use-search-state";
import { SwipePager } from "@/components/SwipePager";
import AppHeader from "@/components/app-header";

import { SourcesDisclaimer } from "@/pages/sources-disclaimer";
import NameSearch from "@/pages/name-search";
import { initializeCacheManagement } from "@/lib/cacheManager";
import { APP_VERSION } from "./version";
import { useAndroidBackButton, syncChromeToTheme, hideLaunchSplash } from "@/lib/native-shell";

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
      <div className="civic-shell min-h-screen flex flex-col bg-background text-foreground">
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
      <div className="civic-shell min-h-screen flex flex-col bg-background text-foreground">
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
    <div className="civic-shell min-h-screen flex flex-col bg-background text-foreground">
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
const DISCLAIMER_KEY = 'disclaimerAcceptedVersion';

function AppContent() {
  const [appStatus, setAppStatus] = useState('initializing'); // 'initializing', 'needsTerms', 'needsDisclaimer', 'ready'
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  const { initializeUserData, isLoading: userDataLoading } = useUserData();
  const [location, setLocation] = useLocation();

  // Android hardware back: close sheet -> back to Find tab -> default exit.
  useAndroidBackButton(location, setLocation);

  // The native splash is held (launchAutoHide: false) until the app reaches
  // its first non-initializing state, then fades out — no white flash.
  useEffect(() => {
    if (appStatus !== 'initializing') {
      hideLaunchSplash();
    }
  }, [appStatus]);

  useEffect(() => {
    // Don't start startup sequence until user data is loaded
    if (userDataLoading) {
      return;
    }

    const startup = async () => {
      try {
        // Sync status bar to the theme the blocking bootstrap in index.html
        // already resolved (was hardcoded Style.Light, wrong for dark).
        if (Capacitor.isNativePlatform()) {
          await StatusBar.setOverlaysWebView({ overlay: true });
          syncChromeToTheme(document.documentElement.classList.contains('dark'));
        }

        // Capacitor App.getInfo is native-only. Keep web/PWA startup deterministic.
        const currentVersion = Capacitor.isNativePlatform()
          ? (await CapApp.getInfo()).version ?? APP_VERSION
          : APP_VERSION;
        setAppVersion(currentVersion);

        // Initialize version-based cache management
        await initializeCacheManagement();

        // Check if terms were accepted for this version
        const result = await Preferences.get({ key: TERMS_KEY });
        const termsAcceptedVersion = result?.value || null;

        // Need to show terms if: never accepted OR accepted for different version
        const needsTerms = !termsAcceptedVersion || termsAcceptedVersion !== currentVersion;

        if (needsTerms) {
          setAppStatus('needsTerms');
          return;
        }

        // Disclaimer: once per version, not on every launch
        const disclaimerResult = await Preferences.get({ key: DISCLAIMER_KEY });
        const disclaimerAcceptedVersion = disclaimerResult?.value || null;
        const needsDisclaimer = disclaimerAcceptedVersion !== currentVersion;

        setAppStatus(needsDisclaimer ? 'needsDisclaimer' : 'ready');
      } catch (error) {
        console.error('[Startup] !!! Error during startup:', error);
        console.error('[Startup] !!! Falling back to showing terms');
        setAppStatus('needsTerms'); // Fallback to showing terms on error
      }
    };

    startup();
  }, [userDataLoading]);

  const handleAcceptPrivacyPolicy = async () => {
    try {
      await Preferences.set({ key: TERMS_KEY, value: appVersion });
      initializeUserData();
      setAppStatus('needsDisclaimer');
    } catch (error) {
      console.error('[Startup] Error saving terms acceptance:', error);
    }
  };

  const handleAcknowledgeDisclaimer = async () => {
    try {
      // Store the accepted version so the disclaimer only re-shows when the
      // app version bumps.
      await Preferences.set({ key: DISCLAIMER_KEY, value: appVersion });
    } catch (error) {
      console.error('[Startup] Error saving disclaimer acknowledgement:', error);
    }
    setAppStatus('ready');
  };

  // Mutually exclusive full-screen states. Kept in one tree so the
  // loading screen can cross-fade out (quick fade) instead of hard-cutting.
  return (
    <>
      <AnimatePresence>
        {appStatus === 'initializing' && <LoadingScreen />}
      </AnimatePresence>
      {appStatus === 'needsTerms' && <TermsModal onAccept={handleAcceptPrivacyPolicy} />}
      {appStatus === 'needsDisclaimer' && <NonAffiliationModal onAcknowledge={handleAcknowledgeDisclaimer} />}
      {appStatus === 'ready' && <Router />}
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <UserDataProvider>
          <SearchStateProvider>
            <TooltipProvider>
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </SearchStateProvider>
        </UserDataProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
