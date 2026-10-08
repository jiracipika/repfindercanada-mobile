import { cn } from "@/lib/utils";

export type CivicLevel = "federal" | "provincial" | "municipal" | "other";

const LEVEL_META: Record<CivicLevel, { label: string; cssVar: string }> = {
  federal: { label: "Federal", cssVar: "--civic-blue" },
  provincial: { label: "Provincial", cssVar: "--civic-purple" },
  municipal: { label: "Municipal", cssVar: "--civic-mint" },
  other: { label: "Other", cssVar: "--muted-foreground" },
};

/**
 * Resolve a representative's government level. Prefers the structured
 * `level` field from the API transform, falls back to the elected office.
 */
export function resolveLevel(
  level?: string | null,
  electedOffice?: string | null,
): CivicLevel {
  if (level === "federal" || level === "provincial" || level === "municipal") {
    return level;
  }
  const office = electedOffice?.toLowerCase();
  if (office === "mp") return "federal";
  if (office === "mpp" || office === "mla" || office === "mna") return "provincial";
  if (office === "mayor" || office === "councillor" || office === "councilor") {
    return "municipal";
  }
  if (level === "other" || level == null || level === "") return "other";
  return "other";
}

interface LevelChipProps {
  level?: string | null;
  electedOffice?: string | null;
  className?: string;
}

/** Federal blue / Provincial purple / Municipal mint level chip. */
export function LevelChip({ level, electedOffice, className }: LevelChipProps) {
  const resolved = resolveLevel(level, electedOffice);
  const meta = LEVEL_META[resolved];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        className,
      )}
      style={{
        color: `var(${meta.cssVar})`,
        borderColor: `color-mix(in srgb, var(${meta.cssVar}) 32%, transparent)`,
        backgroundColor: `color-mix(in srgb, var(${meta.cssVar}) 12%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {meta.label}
    </span>
  );
}
