import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for party accent colours.
 * Used by RepCard now; RepresentativeModal adopts it in phase 2b.
 */

const PARTY_ACCENTS: Array<{ match: string; className: string }> = [
  {
    match: "liberal",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    match: "conservative",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    match: "ndp",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    match: "new democratic",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    match: "bloc",
    className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    match: "green",
    className: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
];

export function getPartyAccentClass(party: string): string {
  const value = party.toLowerCase();
  for (const accent of PARTY_ACCENTS) {
    if (value.includes(accent.match)) return accent.className;
  }
  return "bg-muted text-muted-foreground";
}

/** True when the party should be surfaced at all (independents stay quiet). */
export function hasPartyAffiliation(party?: string | null): boolean {
  return Boolean(party && party.trim().toLowerCase() !== "independent");
}

interface PartyBadgeProps {
  party: string;
  className?: string;
}

export function PartyBadge({ party, className }: PartyBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 rounded-full border border-border/60 px-2.5 font-semibold",
        getPartyAccentClass(party),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
      />
      {party}
    </Badge>
  );
}
