import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface NonAffiliationModalProps {
  onAcknowledge: () => void;
}

export default function NonAffiliationModal({ onAcknowledge }: NonAffiliationModalProps) {
  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Important Disclaimer</DialogTitle>
        </DialogHeader>
        <div className="py-4 text-sm">
          <p className="font-semibold">Not Affiliated with the Government of Canada</p>
          <p className="mt-2">
            Rep Finder for Canada is an independent application and is not affiliated with, sponsored by, or endorsed by any government entity.
          </p>
          <p className="mt-2">
            All data is provided for informational purposes and should be verified with the official sources linked within the app.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={onAcknowledge}>I Understand</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
