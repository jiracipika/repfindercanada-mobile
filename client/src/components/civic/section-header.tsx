import { cn } from "@/lib/utils";
import { LevelChip, type CivicLevel } from "./level-chip";

interface SectionHeaderProps {
  title: string;
  count?: number;
  /** Government level — tints the marker dot. Omit for neutral sections. */
  level?: CivicLevel;
  className?: string;
}

const TONE_VAR: Record<CivicLevel, string> = {
  federal: "--civic-blue",
  provincial: "--civic-purple",
  municipal: "--civic-mint",
  other: "--muted-foreground",
};

/** Grouped-results section header: tone dot, title, hairline, count. */
export function SectionHeader({ title, count, level, className }: SectionHeaderProps) {
  const cssVar = level ? TONE_VAR[level] : "--muted-foreground";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full"
          style={{ background: `var(${cssVar})` }}
        />
        <span className="text-caption1 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {title}
        </span>
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      {typeof count === "number" && (
        <span className="text-caption1 font-semibold text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

// Re-exported so grouped results can share one import site.
export { LevelChip };
