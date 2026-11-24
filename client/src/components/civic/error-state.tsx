import { RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "./motion";

interface ErrorStateProps {
  title?: string;
  description?: React.ReactNode;
  /** When provided, renders a ≥44px Retry button. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Inline failure: headline, what happened, the way back. Same left-aligned
 * typography as EmptyState, marked by a destructive-coloured left rule.
 */export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn("civic-empty civic-empty--alert", className)}
      role="alert"
    >
      <h3 className="text-title3 mb-2 text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-subheadline leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="civic-primary-button mt-5 inline-flex items-center justify-center gap-2 px-5"
        >
          <RotateCcw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </motion.div>
  );
}
