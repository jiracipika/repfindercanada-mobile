import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, ShieldCheck } from "lucide-react";

interface NonAffiliationModalProps {
  onAcknowledge: () => void;
}

export default function NonAffiliationModal({ onAcknowledge }: NonAffiliationModalProps) {
  return (
    <Dialog open>
      <DialogContent className="civic-modal-card max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
        <DialogHeader>
          <div
            className="mb-3 grid h-12 w-12 place-items-center rounded-xl text-primary"
            style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          >
            <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <span className="civic-kicker">Independent by design</span>
          <DialogTitle className="text-title2 pt-2 text-left">
            Verify important details at the source.
          </DialogTitle>
        </DialogHeader>
        <div className="text-subheadline space-y-3 py-2 text-muted-foreground">
          <p>
            RepFinder Canada is an independent civic tool. It is not affiliated with, sponsored by, or endorsed by a government entity.
          </p>
          <p className="flex gap-2 rounded-xl bg-muted p-3">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
