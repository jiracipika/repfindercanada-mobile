import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, springSoft } from "./motion";

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
      transition={springSoft}
      className={cn("civic-empty", className)}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary/10 text-[var(--civic-blue)]"
        >
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-lg font-bold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </motion.div>
  );
}
