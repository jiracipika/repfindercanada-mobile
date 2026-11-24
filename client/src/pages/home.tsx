import { useState } from "react";
import { motion } from "framer-motion";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { ArrowUpRight, Database, MapPinCheck, ShieldCheck, WifiOff } from "lucide-react";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { EmptyState, ErrorState } from "@/components/civic";
import { FieldCard } from "@/components/civic/field-card";
import { WhoHandlesWhat } from "@/components/civic/who-handles-what";
import { SectionHeader } from "@/components/civic/section-header";
import { Skeleton } from "@/components/civic/skeleton";
import { PullToRefresh } from "@/components/civic/pull-to-refresh";
import { useSearchState } from "@/hooks/use-search-state";
import {
  fadeUp,
  fadeUpItem,
  staggerContainer,
} from "@/components/civic/motion";

const sortRepresentatives = (representatives: Representative[]): Representative[] => {
  const level = (office?: string | null) => {
    const value = office?.toLowerCase();
    if (value === "mp") return 1;
    if (["mpp", "mla", "mna"].includes(value || "")) return 2;
    if (["mayor", "councillor", "councilor"].includes(value || "")) return 3;
    return 999;
  };
  return [...representatives].sort((a, b) => level(a.electedOffice) - level(b.electedOffice));
};

type LevelGroup = "federal" | "provincial" | "municipal" | "other";

const LEVEL_GROUPS: Array<{ key: LevelGroup; title: string }> = [
  { key: "federal", title: "Federal" },
  { key: "provincial", title: "Provincial" },
  { key: "municipal", title: "Municipal" },
  { key: "other", title: "Other representatives" },
];

const groupOf = (representative: Representative): LevelGroup => {
  if (
    representative.level === "federal" ||
    representative.level === "provincial" ||
    representative.level === "municipal"
  ) {
    return representative.level;
  }
  const office = representative.electedOffice?.toLowerCase();
  if (office === "mp") return "federal";
  if (office === "mpp" || office === "mla" || office === "mna") return "provincial";
  if (office === "mayor" || office === "councillor" || office === "councilor") {
    return "municipal";
  }
  return "other";
};

export default function Home() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  // Search state lives in SearchStateProvider (above the SwipePager) so
  // results survive tab swipes.
  const {
    submittedQuery,
    outcome,
    isSearching,
    error,
    retry,
  } = useSearchState();

  const searchResults = sortRepresentatives(outcome?.results ?? []);
  const fromCache = outcome?.fromCache ?? false;
  const cachedAt = outcome?.cachedAt ?? null;

  // Grouped federal/provincial/municipal — order preserved from the existing sort.
  const grouped = LEVEL_GROUPS.map(({ key, title }) => ({
    key,
    title,
    reps: searchResults.filter((representative) => groupOf(representative) === key),
  })).filter((group) => group.reps.length > 0);

  return (
    <PullToRefresh onRefresh={() => retry()} className="h-full">
      <main className="civic-page">
        <motion.header
          className="civic-page-header civic-find-header"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h2 variants={fadeUpItem} className="civic-title">
            Know who represents you.
          </motion.h2>
          <motion.p variants={fadeUpItem} className="civic-lede">
            Enter a Canadian postal code, representative name, city, area or riding to find representatives from linked public sources.
          </motion.p>
          <motion.div variants={fadeUpItem} className="civic-trust-row" aria-label="Privacy and source information">
            <span className="civic-trust-chip"><ShieldCheck className="h-3.5 w-3.5" /> Private by design</span>
            <span className="civic-trust-chip"><Database className="h-3.5 w-3.5" /> Public data</span>
            <span className="civic-trust-chip"><MapPinCheck className="h-3.5 w-3.5" /> Canada-wide</span>
          </motion.div>
        </motion.header>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
        >
          <Section className="civic-search-panel">
            <SearchForm />
          </Section>
        </motion.div>

        {/* Single inline error path: one ErrorState with Retry (no toasts) */}
        {error && !isSearching && (
          <Section className="mt-5">
            <ErrorState
              title="Search unavailable"
              description={error.message}
              onRetry={retry}
            />
          </Section>
        )}

        {/* Offline banner: API failed, cached results served — never without this banner */}
        {fromCache && !isSearching && searchResults.length > 0 && (
          <Section className="mt-5">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 text-footnote text-muted-foreground">
                Showing saved results{cachedAt ? ` from ${new Date(cachedAt).toLocaleString()}` : ""} — offline
              </span>
              <button
                type="button"
                onClick={retry}
                className="min-h-[44px] shrink-0 rounded-lg px-2 text-footnote font-semibold text-primary-text active:opacity-70"
              >
                Retry
              </button>
            </div>
          </Section>
        )}

        {isSearching && (
          <Section className="mt-5 space-y-3" aria-live="polite" aria-busy="true">
            <p className="text-sm font-semibold text-muted-foreground">Searching representatives…</p>
            {[0, 1, 2].map((index) => (
              <div key={index} className="civic-panel overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2.5 pt-1">
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-none" />
              </div>
            ))}
          </Section>
        )}

        {searchResults.length > 0 && !isSearching && (
          <Section className="mt-6" aria-live="polite">
            <motion.div
              className="space-y-4"
              variants={fadeUp}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-end justify-between gap-3">
                <h3 className="text-title3 text-foreground">Representatives found</h3>
                <span className="text-footnote font-semibold text-muted-foreground tnum">
                  {searchResults.length} found
                </span>
              </div>

              {grouped.map((group) => (
                <div key={group.key} className="space-y-3">
                  <SectionHeader
                    title={group.title}
                    count={group.reps.length}
                    level={group.key}
                  />
                  {group.reps.map((representative) => (
                    <div key={representative.id}>
                      <RepresentativeCard
                        representative={representative}
                        onViewProfile={() => setSelectedRepresentative(representative)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </Section>
        )}

        {searchResults.length === 0 && !isSearching && !error && (
          <Section className="mt-5 px-0">
            {submittedQuery ? (
              <>
                <EmptyState
                  title="No representatives found"
                  description={`We couldn't find any representatives for "${submittedQuery}". Try another name, city, riding or postal code. Coverage varies by area.`}
                />
                <div className="mt-4 px-4">
                  <button type="button" className="civic-text-link" onClick={() => setGuideOpen(true)}>
                    Who handles what? <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              // Before the first search: the guide's editorial image, with the
              // red note into "Who handles what?", where an empty state used
              // to repeat the privacy note.
              <FieldCard onOpenGuide={() => setGuideOpen(true)} />
            )}
          </Section>
        )}

        {selectedRepresentative && (
          <RepresentativeModal
            representative={selectedRepresentative}
            isOpen
            onClose={() => setSelectedRepresentative(null)}
          />
        )}
      </main>

      <WhoHandlesWhat open={guideOpen} onOpenChange={setGuideOpen} />
    </PullToRefresh>
  );
}
