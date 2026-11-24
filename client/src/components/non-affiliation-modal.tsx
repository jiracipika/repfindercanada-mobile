import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";

interface NonAffiliationModalProps {
  onAcknowledge: () => void;
}

export default function NonAffiliationModal({ onAcknowledge }: NonAffiliationModalProps) {
  return (
    // Must be acknowledged to continue, so there is no close button: the X
    // this dialog used to render did nothing when tapped.
    <Dialog open>
      <DialogContent showClose={false} className="civic-modal-card max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
        <BrandLockup />
        <DialogHeader>
          <DialogTitle className="text-title2 text-left text-balance">
            Verify important details at the source.
          </DialogTitle>
        </DialogHeader>
        <div className="text-subheadline space-y-3 text-muted-foreground">
          <p>
            RepFinder Canada is an independent civic tool. It is not affiliated with, sponsored by, or endorsed by a government entity.
          </p>
          <p className="flex gap-2 rounded-xl bg-muted p-3 leading-relaxed">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            Representative profiles include public-source links so contact details can be verified before use.
          </p>
        </div>
        <DialogFooter>
          <Button className="civic-primary-button w-full" onClick={onAcknowledge}>Continue to RepFinder Canada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
