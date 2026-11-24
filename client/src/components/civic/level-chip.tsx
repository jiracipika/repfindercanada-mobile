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

/** Federal blue / Provincial purple / Municipal mint level chip — flat tinted capsule. */
export function LevelChip({ level, electedOffice, className }: LevelChipProps) {
  const resolved = resolveLevel(level, electedOffice);
  const meta = LEVEL_META[resolved];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold leading-tight",
        className,
      )}
      style={{
        color: `var(${meta.cssVar})`,
        backgroundColor: `color-mix(in srgb, var(${meta.cssVar}) 15%, transparent)`,
      }}
    >
      {meta.label}
    </span>
  );
}
