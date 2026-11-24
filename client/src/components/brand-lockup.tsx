import { MapPin } from "lucide-react";

/**
 * Brand lockup for the first-run screens, which have no app header: the mark,
 * the wordmark and the app's one-line promise. Presentational only.
 */
export function BrandLockup() {
  return (
    <div className="brand-lockup flex items-center gap-3">
      <span className="brand-mark brand-mark--lockup" aria-hidden="true">
        <MapPin className="h-6 w-6" strokeWidth={2.3} />
      </span>
      <span className="min-w-0">
        <span className="brand-wordmark block text-foreground">RepFinder Canada</span>
        <span className="brand-tagline text-footnote block text-muted-foreground">Know who represents you.</span>
      </span>
    </div>
  );
}
