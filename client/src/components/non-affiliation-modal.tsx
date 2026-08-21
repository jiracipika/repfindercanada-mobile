import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, ShieldCheck } from "lucide-react";

interface NonAffiliationModalProps {
  onAcknowledge: () => void;
}

export default function NonAffiliationModal({ onAcknowledge }: NonAffiliationModalProps) {
  return (
    <Dialog open>
      <DialogContent className="civic-modal-card max-w-[calc(100vw-2rem)] border-border sm:max-w-[425px]">
        <DialogHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="civic-kicker">Independent by design</span>
          <DialogTitle className="pt-2 text-left text-2xl font-extrabold tracking-tight">
            Verify important details at the source.
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            Rep Finder is an independent civic tool. It is not affiliated with, sponsored by, or endorsed by a government entity.
          </p>
          <p className="flex gap-2 rounded-xl border border-border bg-background/45 p-3">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[var(--civic-blue)]" />
            Representative profiles include public-source links so contact details can be verified before use.
          </p>
        </div>
        <DialogFooter>
          <Button className="civic-primary-button w-full" onClick={onAcknowledge}>Continue to Rep Finder</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
