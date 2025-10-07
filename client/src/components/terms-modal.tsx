import { FC, useRef, useEffect } from 'react';
import { Browser } from '@capacitor/browser';
import { isPlatform } from '@ionic/react';
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
      console.log('[TermsModal] Scroll check - scrollTop:', scrollTop, 'clientHeight:', clientHeight, 'scrollHeight:', scrollHeight);
      // Allow a small buffer (e.g., 10 pixels) for scrolling to the bottom
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      console.log('[TermsModal] Is at bottom?', isAtBottom);
      if (isAtBottom) {
        console.log('[TermsModal] User reached bottom - enabling Accept button');
        setCanAccept(true);
      } else {
        setCanAccept(false); // In case user scrolls back up
      }
    }
  };

  const handleCloseApp = () => {
    console.log('[TermsModal] User declined terms - closing app');
    if (isPlatform('capacitor')) {
      (window as any).Capacitor.Plugins.App.exitApp();
    } else {
      window.close(); // Fallback for web environment
    }
  };

  const handleAccept = () => {
    console.log('[TermsModal] User clicked Accept button');
    onAccept();
  };

  useEffect(() => {
    console.log('[TermsModal] Component mounted');
    // Check initial scroll position in case content is not scrollable
    if (termsRef.current) {
      console.log('[TermsModal] Checking if content is scrollable...');
      handleScroll();
    }
  }, []);

  const privacyPolicyUrl = 'https://canadarepfinder.vercel.app/privacy';

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Privacy Policy for Canada Rep Finder</h1>
          <div
            ref={termsRef}
            onScroll={handleScroll}
            className="text-sm text-neutral-600 mb-6 overflow-y-auto max-h-[60vh] p-2 border rounded-md"
          >
            <p className="mb-2"><b>Last updated: September 24, 2025</b></p>

            <h2 className="text-lg font-semibold mt-4 mb-2">Data Use & Privacy</h2>
            <p className="mb-2">At Canada Rep Finder, your privacy is paramount. We want to be transparent about how your data is handled:</p>
            <ul className="list-disc list-inside mb-2">
              <li><b>Postal code/location:</b> Your postal code or location data is processed once on your device to determine your electoral district. It is never stored or transmitted off your device.</li>
              <li><b>Analytics, Ads, or Tracking:</b> This application does not use any analytics, display ads, or incorporate any tracking mechanisms.</li>
              <li><b>Local Storage:</b> The only data stored locally on your device are the names of representatives and their ridings from your recent lookups. This data is stored solely for your convenience and can be cleared by you at any time within the app.</li>
            </ul>

            <h2 className="text-lg font-semibold mt-4 mb-2">Sources of Information</h2>
            <p className="mb-2">Canada Rep Finder aggregates publicly available information from official sources to help you find your elected representatives. We rely on the following data sources:</p>
            <ul className="list-disc list-inside mb-2">
              <li>Represent by Open North: <a href="https://represent.opennorth.ca/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://represent.opennorth.ca/</a></li>
              <li>House of Commons – Members (MPs): <a href="https://www.ourcommons.ca/members/en/search" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.ourcommons.ca/members/en/search</a></li>
              <li>Senate of Canada – Senators: <a href="https://sencanada.ca/en/senators/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://sencanada.ca/en/senators/</a></li>
              <li>Elections Canada – Electoral District Lookup: <a href="https://www.elections.ca/content.aspx" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">https://www.elections.ca/content.aspx</a></li>
            </ul>

            <h2 className="text-lg font-semibold mt-4 mb-2">Disclaimer</h2>
            <p className="mb-2">Canada Rep Finder is an independent application developed for informational and educational purposes only. It is not affiliated with, endorsed by, or officially connected to the Government of Canada, the House of Commons, the Senate of Canada, Elections Canada, or any other government entity. All information is provided "as is" and users are encouraged to verify details with official sources.</p>
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setShowDisagreeAlert(true)}>
              Decline
            </Button>
            <Button onClick={handleAccept} disabled={!canAccept}>
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
              You must accept the Privacy Policy to use Canada Rep Finder. If you decline, the app will close.
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