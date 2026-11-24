import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "./motion";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  /** Optional call-to-action (already ≥44px if interactive). */
  action?: ReactNode;
  className?: string;
}

/**
 * Typographic empty state: bold left-aligned headline, one plain sentence,
 * optional action. No icon tile above the heading — the field guide speaks
 * in type, and an icon that only decorates says nothing.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={cn("civic-empty", className)}
    >
      <h3 className="text-title3 mb-2 text-foreground">{title}</h3>
      {description && (
        <p className="max-w-sm text-subheadline leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-start">{action}</div>}
    </motion.div>
  );
}
