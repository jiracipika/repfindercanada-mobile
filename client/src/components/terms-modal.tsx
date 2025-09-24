import { FC } from 'react';
import { Browser } from '@capacitor/browser';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface TermsModalProps {
  onAccept: () => void;
}

const TermsModal: FC<TermsModalProps> = ({ onAccept }) => {
  const [showDisagreeAlert, setShowDisagreeAlert] = useState(false);

  const openLink = async (url: string) => {
    await Browser.open({ url });
  };

  const privacyPolicyUrl = 'https://canadarepfinder.vercel.app/privacy';
  const termsUrl = 'https://canadarepfinder.vercel.app/terms'; // Assuming you will host terms-of-service.html here

  return (
    <>
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Welcome to Canada Rep Finder</h1>
          <p className="text-muted-foreground mb-6">
            Before you begin, please review and accept our Terms of Service and Privacy Policy. Your agreement is required to use the app.
          </p>

          <div className="mb-6 space-y-2">
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600"
              onClick={() => openLink(termsUrl)}
            >
              View Terms of Service
            </Button>
            <br />
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600"
              onClick={() => openLink(privacyPolicyUrl)}
            >
              View Privacy Policy
            </Button>
          </div>

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setShowDisagreeAlert(true)}>
              Disagree
            </Button>
            <Button onClick={onAccept}>
              Agree
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDisagreeAlert} onOpenChange={setShowDisagreeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agreement Required</AlertDialogTitle>
            <AlertDialogDescription>
              You must agree to the Terms of Service and Privacy Policy to use Canada Rep Finder. Please close the app if you do not agree.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDisagreeAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TermsModal;