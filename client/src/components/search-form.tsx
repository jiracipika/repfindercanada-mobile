import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, MapPin, WifiOff } from "lucide-react";
import { resolveSearchIntent } from "@/lib/searchIntent";
import { useSearchState } from "@/hooks/use-search-state";

/** One input over the persistent postal, text and location search state. */
export function SearchForm() {
  const { query, setQuery, runSearch, isSearching, inputError, geoError, isLocating, locateAndSearch } = useSearchState();
  const intent = resolveSearchIntent(query);
  const hint = !query.trim()
    ? 'Postal code (K1A 0A9), name, city, area or riding.'
    : intent.kind === 'postal'
      ? 'Postal code recognized. Find representatives for this location.'
      : intent.kind === 'invalid' ? intent.message : 'Search representative names, cities, areas and ridings.';

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => { event.preventDefault(); runSearch(query); }} aria-label="Find representatives">
        <label htmlFor="representative-search" className="mb-2 block text-sm font-semibold text-foreground">Postal code, name or place</label>
        <div className="relative">
          <Input id="representative-search" type="search" placeholder="Postal code, name, city or riding"
            value={query} onChange={(event) => setQuery(event.target.value)}
            className="civic-search-input relative pl-11 font-normal text-foreground"
            inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="search"
            aria-invalid={!!inputError} aria-describedby={`search-hint${inputError ? ' search-input-error' : ''}`} />
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <p id="search-hint" className="text-footnote mt-2 text-muted-foreground">{hint}</p>
        {inputError && <p id="search-input-error" role="alert" className="text-footnote mt-2" style={{ color: 'var(--destructive)' }}>{inputError}</p>}
        <Button type="submit" disabled={isSearching || !query.trim()} className="civic-primary-button mt-3 w-full">
          {isSearching ? <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <Search aria-hidden="true" className="mr-2 h-5 w-5" />}
          <span>{isSearching ? 'Searching…' : 'Find representatives'}</span>
        </Button>
      </form>
      {geoError && <p role="alert" className="text-footnote flex items-start gap-1.5" style={{ color: 'var(--destructive)' }}>
        <WifiOff aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{geoError}</span>
      </p>}
      <Button type="button" onClick={() => void locateAndSearch()} disabled={isLocating || isSearching}
        className="civic-tinted-button h-11 w-full rounded-xl text-body font-semibold">
        {isLocating ? <Loader2 aria-hidden="true" className="mr-2 h-5 w-5 animate-spin" /> : <MapPin aria-hidden="true" className="mr-2 h-5 w-5" />}
        <span>{isLocating ? 'Finding your location…' : 'Use my location'}</span>
      </Button>
    </div>
  );
}
