import { cn } from "@/lib/utils";

/**
 * Single source of truth for party accent colours (text-tone classes only;
 * the badge stays flat — the party color lives in the dot).
 */

const PARTY_ACCENTS: Array<{ match: string; className: string }> = [
  {
    match: "liberal",
    className: "text-red-600 dark:text-red-400",
  },
  {
    match: "conservative",
    className: "text-blue-600 dark:text-blue-400",
  },
  {
    match: "ndp",
    className: "text-orange-600 dark:text-orange-400",
  },
  {
    match: "new democratic",
    className: "text-orange-600 dark:text-orange-400",
  },
  {
    match: "bloc",
    className: "text-cyan-600 dark:text-cyan-400",
  },
  {
    match: "green",
    className: "text-green-600 dark:text-green-400",
  },
];

export function getPartyAccentClass(party: string): string {
  const value = party.toLowerCase();
  for (const accent of PARTY_ACCENTS) {
    if (value.includes(accent.match)) return accent.className;
  }
  return "text-muted-foreground";
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] leading-tight",
        getPartyAccentClass(party),
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      <span className="text-muted-foreground">{party}</span>
    </span>
  );
}
