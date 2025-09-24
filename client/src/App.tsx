import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Preferences } from "@capacitor/preferences";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Search from "@/pages/search";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import LoadingScreen from "@/components/loading-screen";
import TermsModal from "@/components/terms-modal";
import NonAffiliationModal from "@/components/non-affiliation-modal";
import { UserDataProvider, useUserData } from "@/hooks/use-user-data";

import { SourcesDisclaimer } from "@/pages/sources-disclaimer";


function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />
      <main className="flex-1 pb-20">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/search" component={Search} />
          <Route path="/saved" component={Saved} />
          <Route path="/profile" component={Profile} />
          <Route path="/sources-disclaimer" component={SourcesDisclaimer} />
          
          <Route component={NotFound} />
        </Switch>
      </main>
      <div className="fixed bottom-16 left-0 right-0 flex justify-center pb-1 pt-2 bg-neutral-50 text-xs">
        <a href="/sources-disclaimer" className="text-blue-500 hover:underline">
          Sources & Disclaimers
        </a>
      </div>
      <BottomNav />
    </div>
  );
}

function AppContent() {
  const [appStatus, setAppStatus] = useState('initializing'); // 'initializing', 'needsTerms', 'needsDisclaimer', 'ready'
  const { initializeUserData } = useUserData();

  useEffect(() => {
    const startup = async () => {
      console.log('[Startup] Checking for terms and disclaimer acceptance...');
      try {
        const { value: termsValue } = await Preferences.get({ key: 'termsAccepted' });
        if (termsValue !== 'true') {
          setAppStatus('needsTerms');
          return;
        }

        const { value: disclaimerValue } = await Preferences.get({ key: 'disclaimerAcknowledged' });
        if (disclaimerValue !== 'true') {
          setAppStatus('needsDisclaimer');
          return;
        }

        setAppStatus('ready');
      } catch (error) {
        console.error('[Startup] Error checking preferences:', error);
        setAppStatus('needsTerms'); // Fallback to showing terms on error
      }
    };

    startup();
  }, []);

  const handleAcceptTerms = async () => {
    await Preferences.set({ key: 'termsAccepted', value: 'true' });
    initializeUserData();
    setAppStatus('needsDisclaimer');
  };

  const handleAcknowledgeDisclaimer = async () => {
    await Preferences.set({ key: 'disclaimerAcknowledged', value: 'true' });
    setAppStatus('ready');
  };

  if (appStatus === 'initializing') {
    return <LoadingScreen />;
  }

  if (appStatus === 'needsTerms') {
    return <TermsModal onAccept={handleAcceptTerms} />;
  }

  if (appStatus === 'needsDisclaimer') {
    return <NonAffiliationModal onAcknowledge={handleAcknowledgeDisclaimer} />;
  }

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
