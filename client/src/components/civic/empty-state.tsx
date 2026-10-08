import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "./motion";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (already ≥44px if interactive). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn("civic-empty", className)}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-primary"
          style={{
            backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
          }}
        >
          {icon}
        </div>
      )}
      <h3 className="text-headline mb-2 text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto max-w-sm text-subheadline text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </motion.div>
  );
}
