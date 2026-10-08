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

export function ErrorState({
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
      className={cn("civic-empty", className)}
      role="alert"
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl"
        style={{
          color: "var(--civic-red)",
          backgroundColor: "color-mix(in srgb, var(--civic-red) 12%, transparent)",
        }}
      >
        <RotateCcw className="h-7 w-7" />
      </div>
      <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-primary-foreground transition-transform active:translate-y-px"
          style={{
            background: "linear-gradient(135deg, var(--primary), #ff8465)",
            boxShadow: "0 10px 24px color-mix(in srgb, var(--primary) 26%, transparent)",
          }}
        >
          <RotateCcw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </motion.div>
  );
}
