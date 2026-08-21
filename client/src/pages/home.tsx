import { useState } from "react";
import { Link } from "wouter";
import { SearchForm } from "@/components/search-form";
import { RepresentativeCard } from "@/components/representative-card";
import { RepresentativeModal } from "@/components/representative-modal";
import { Building2, Database, Loader2, MapPinCheck, ShieldCheck, Terminal, UserSearch } from "lucide-react";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { Section } from "@/components/ui/section";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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

export default function Home() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<Representative | null>(null);
  const [searchResults, setSearchResults] = useState<Representative[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchComplete = (results: Representative[]) => {
    setSearchResults(sortRepresentatives(results));
    setIsSearching(false);
    setSearchError(null);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <main className="civic-page">
        <header className="civic-page-header">
          <span className="civic-kicker">Your democracy, mapped</span>
          <h2 className="civic-title">Know who represents you.</h2>
          <p className="civic-lede">
            Enter a Canadian postal code to identify your federal, provincial, and municipal representatives from linked public sources.
          </p>
          <div className="civic-trust-row" aria-label="Privacy and source information">
            <span className="civic-trust-chip"><ShieldCheck className="h-3.5 w-3.5" /> Private by design</span>
            <span className="civic-trust-chip"><Database className="h-3.5 w-3.5" /> Public data</span>
            <span className="civic-trust-chip"><MapPinCheck className="h-3.5 w-3.5" /> Canada-wide</span>
          </div>
        </header>

        <Section className="civic-search-panel">
          <SearchForm
            onSearchStart={() => {
              setSearchResults([]);
              setIsSearching(true);
              setSearchError(null);
            }}
            onSearchComplete={handleSearchComplete}
            onSearchError={(error) => {
              setSearchError(error);
              setIsSearching(false);
              setSearchResults([]);
            }}
          />
          <div className="mt-3 border-t border-border/70 pt-3">
            <Link href="/name-search">
              <Button variant="ghost" className="h-12 w-full rounded-xl text-muted-foreground">
                <UserSearch className="mr-2 h-4 w-4" /> Search by representative name
              </Button>
            </Link>
          </div>
        </Section>

        {searchError && (
          <Section className="mt-5">
            <Alert variant="destructive" className="rounded-2xl">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Search unavailable</AlertTitle>
              <AlertDescription>{searchError}</AlertDescription>
            </Alert>
          </Section>
        )}

        {isSearching && (
          <Section className="mt-5">
            <Card className="civic-panel">
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                <p className="font-semibold">Mapping your districts…</p>
                <p className="mt-1 text-center text-xs text-muted-foreground">Checking federal, provincial, and municipal records.</p>
              </CardContent>
            </Card>
          </Section>
        )}

        {searchResults.length > 0 && !isSearching && (
          <Section className="mt-6 space-y-4" aria-live="polite">
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="civic-kicker">District matched</span>
                <h3 className="mt-2 text-xl font-bold">Your representatives</h3>
              </div>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
                {searchResults.length} found
              </span>
            </div>
            {searchResults.map((representative) => (
              <RepresentativeCard
                key={representative.id}
                representative={representative}
                onViewProfile={() => setSelectedRepresentative(representative)}
              />
            ))}
          </Section>
        )}

        {searchResults.length === 0 && !isSearching && !searchError && (
          <Section className="mt-5">
            <div className="civic-empty">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary/10 text-[var(--civic-blue)]">
                <Building2 className="h-7 w-7" />
              </div>
              <CardTitle className="mb-2 text-lg">Ready when you are</CardTitle>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                Your postal code is used for this lookup and is not sent to an advertising or analytics service.
              </p>
            </div>
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
    </div>
  );
}
