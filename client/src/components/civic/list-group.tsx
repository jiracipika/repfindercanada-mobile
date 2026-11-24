import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * iOS inset-grouped container: card surface, 12px radius. Rows inside
 * draw their own hairline separators (inset 16px from the leading edge).
 */
export function ListGroup({ children, className }: ListGroupProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card text-card-foreground", className)}>
      {children}
    </div>
  );
}

/** Small caps group label rendered above a ListGroup (iOS section header). */
export function ListSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3
      className={cn(
        "mb-2 px-1 text-caption1 font-semibold uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}

interface ListRowProps {
  /** Leading tint icon (pass pre-sized, e.g. h-[22px] w-[22px], strokeWidth 1.8). */
  icon?: ReactNode;
  /** Primary label. */
  label: ReactNode;
  /** Trailing secondary value, rendered before the chevron. */
  detail?: ReactNode;
  href?: string;
  /** Open `href` in a new tab with noopener. */
  external?: boolean;
  onClick?: () => void;
  /** Muted trailing chevron for navigational rows. */
  chevron?: boolean;
  disabled?: boolean;
  /** Hairline separator across the top of this row, inset 16px on the left. */
  divider?: boolean;
  className?: string;
  labelClassName?: string;
}

/**
 * One inset-grouped row: ≥44px tall, 16px insets, hairline divider.
 * Renders an anchor (href), a button (onClick) or a plain row.
 */
export function ListRow({
  icon,
  label,
  detail,
  href,
  external,
  onClick,
  chevron,
  disabled,
  divider,
  className,
  labelClassName,
}: ListRowProps) {
  const interactive = !disabled && Boolean(href || onClick);

  const rowClass = cn(
    "relative flex min-h-[44px] w-full items-center gap-3 px-4 py-2.5 text-left",
    interactive ? "transition-colors active:bg-muted/60" : "",
    disabled && "opacity-50",
    className,
  );

  const content = (
    <>
      {divider && (
        <span
          aria-hidden="true"
          className="absolute left-4 right-0 top-0 h-px"
          style={{ background: "var(--border)" }}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="flex shrink-0 items-center justify-center text-primary">
          {icon}
        </span>
      )}
      {/* Labels wrap rather than truncate: an email address or a source name
          cut with an ellipsis is information the row exists to show. */}
      <span
        className={cn(
          "min-w-0 flex-1 break-words text-body text-foreground",
          disabled && "text-muted-foreground",
          labelClassName,
        )}
      >
        {label}
      </span>
      {detail != null && (
        <span className="shrink-0 text-subheadline text-muted-foreground">{detail}</span>
      )}
      {chevron && !disabled && (
        <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={rowClass}
      >
        {content}
      </a>
    );
  }

  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={rowClass}>
        {content}
      </button>
    );
  }

  return (
    <div className={rowClass} aria-disabled={disabled || undefined}>
      {content}
    </div>
  );
}
