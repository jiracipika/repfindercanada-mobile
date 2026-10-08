import { FC, useRef, useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TermsModalProps {
  onAccept: () => void;
}

const TermsModal: FC<TermsModalProps> = ({ onAccept }) => {
  const [showDisagreeAlert, setShowDisagreeAlert] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const [canAccept, setCanAccept] = useState(false);

  const openLink = async (url: string) => {
    await Browser.open({ url });
  };

  const handleScroll = () => {
    if (termsRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = termsRef.current;
      // Allow a small buffer (e.g., 10 pixels) for scrolling to the bottom
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isAtBottom) {
        setCanAccept(true);
      } else {
        setCanAccept(false); // In case user scrolls back up
      }
    }
  };

  const handleCloseApp = () => {
    if (Capacitor.isNativePlatform()) {
      (window as any).Capacitor.Plugins.App.exitApp();
    } else {
      window.close(); // Fallback for web environment
    }
  };

  const handleAccept = () => {
    onAccept();
  };

  useEffect(() => {
    // Check initial scroll position in case content is not scrollable
    if (termsRef.current) {
      handleScroll();
    }
  }, []);

  const privacyPolicyUrl = 'https://canadarepfinder.vercel.app/privacy';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40"></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-pt safe-pb">
        <div className="civic-modal-card w-full max-w-md p-5 sm:p-6">
          <span className="civic-kicker">Before you begin</span>
          <h1 className="text-title2 mb-2 mt-2 text-foreground">Your privacy, in plain language.</h1>
          <p className="text-subheadline mb-4 text-muted-foreground">Review how RepFinder Canada handles postal codes and public representative data.</p>
          <div
            ref={termsRef}
            onScroll={handleScroll}
            className="mb-5 max-h-[54vh] overflow-y-auto rounded-xl bg-muted p-4 text-subheadline text-muted-foreground"
          >
            <p className="mb-2"><b>Last updated: September 24, 2025</b></p>

            <h2 className="text-lg font-semibold mt-4 mb-2">Data Use & Privacy</h2>
            <p className="mb-2">At RepFinder Canada, your privacy is paramount. We want to be transparent about how your data is handled:</p>
            <ul className="list-disc list-inside mb-2">
              <li><b>Postal code/location:</b> Your postal code or location data is processed once on your device to determine your electoral district. It is never stored or transmitted off your device.</li>
              <li><b>Analytics, Ads, or Tracking:</b> This application does not use any analytics, display ads, or incorporate any tracking mechanisms.</li>
              <li><b>Local Storage:</b> The only data stored locally on your device are the names of representatives and their ridings from your recent lookups. This data is stored solely for your convenience and can be cleared by you at any time within the app.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-4 mb-2">Sources of Information</h2>
            <p className="mb-2">RepFinder Canada aggregates publicly available information from official sources to help you find your elected representatives. We rely on the following data sources:</p>
            <ul className="list-disc list-inside mb-2">
              <li>Represent by Open North: <a href="https://represent.opennorth.ca/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://represent.opennorth.ca/</a></li>
              <li>House of Commons – Members (MPs): <a href="https://www.ourcommons.ca/members/en/search" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.ourcommons.ca/members/en/search</a></li>
              <li>Senate of Canada – Senators: <a href="https://sencanada.ca/en/senators/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://sencanada.ca/en/senators/</a></li>
              <li>Elections Canada – Electoral District Lookup: <a href="https://www.elections.ca/content.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.elections.ca/content.aspx</a></li>
            </ul>

            <h2 className="text-lg font-semibold mt-4 mb-2">Disclaimer</h2>
            <p className="mb-2">RepFinder Canada is an independent application developed for informational and educational purposes only. It is not affiliated with, endorsed by, or officially connected to the Government of Canada, the House of Commons, the Senate of Canada, Elections Canada, or any other government entity. All information is provided "as is" and users are encouraged to verify details with official sources.</p>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button
              variant="ghost"
              className="min-h-12 rounded-xl px-4 font-semibold text-primary"
              onClick={() => setShowDisagreeAlert(true)}
            >
              Decline
            </Button>
            <Button className="civic-primary-button" onClick={handleAccept} disabled={!canAccept}>
              Accept {!canAccept && '(scroll to bottom)'}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDisagreeAlert} onOpenChange={setShowDisagreeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Privacy Policy Agreement Required</AlertDialogTitle>
            <AlertDialogDescription>
              You must accept the Privacy Policy to use RepFinder Canada. If you decline, the app will close.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleCloseApp}>
              Close App
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setShowDisagreeAlert(false)}>
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TermsModal;