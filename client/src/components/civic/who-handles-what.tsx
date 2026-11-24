import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { BottomSheet } from "./bottom-sheet";

type GuideLevel = "federal" | "provincial" | "municipal";

/** Same wording as the web sibling's government explainer (features-section). */
const LEVELS: Array<{ level: GuideLevel; title: string; office: string; description: string }> = [
  {
    level: "federal",
    title: "Federal",
    office: "Your Member of Parliament",
    description: "Immigration, national defence, federal taxes, and benefits.",
  },
  {
    level: "provincial",
    title: "Provincial & territorial",
    office: "Your MLA, MPP, MNA, or MHA",
    description: "Health care, education, and provincial or territorial services.",
  },
  {
    level: "municipal",
    title: "Municipal",
    office: "Your mayor and councillors",
    description: "Local roads, parks, waste collection, and community planning.",
  },
];

const TONE: Record<GuideLevel, string> = {
  federal: "--civic-blue",
  provincial: "--civic-purple",
  municipal: "--civic-mint",
};

interface WhoHandlesWhatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Who handles what?" — the Civic Field Guide's government explainer: three
 * stacked cards, one per level. Level colours are labels, never party colours,
 * and every card is titled so the colour never carries the meaning alone.
 */
export function WhoHandlesWhat({ open, onOpenChange }: WhoHandlesWhatProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      label="Who handles what?"
      header={
        <div className="relative px-4 pb-3 pt-1">
          <h2 className="text-title2 pr-12 text-foreground">Who handles what?</h2>
          <p className="mt-1 text-subheadline leading-relaxed text-muted-foreground">
            Different decisions happen at different levels. Here is a starting point for finding the
            right office. Responsibilities can overlap.
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            // Keep the header's drag-to-dismiss zone from swallowing this press.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close"
            className="absolute right-1 top-0 grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted"
          >
            <X className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <div className="space-y-3 px-4 pb-6 pt-1">
        {LEVELS.map(({ level, title, office, description }) => (
          <article
            key={level}
            className="civic-level-card"
            style={{ "--level-color": `var(${TONE[level]})` } as CSSProperties}
          >
            <h3 className="text-headline text-foreground">{title}</h3>
            <p className="mt-1 text-subheadline font-semibold" style={{ color: `var(${TONE[level]})` }}>
              {office}
            </p>
            <p className="mt-1 text-subheadline leading-relaxed text-muted-foreground">{description}</p>
          </article>
        ))}
        <p className="px-1 pt-1 text-footnote leading-relaxed text-muted-foreground">
          Coverage varies by location. Municipal officials appear where data is available from
          Represent by Open North.
        </p>
      </div>
    </BottomSheet>
  );
}
