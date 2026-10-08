import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Shimmer skeleton. Framer-motion translate sweep, transform-only;
 * static tint for reduced-motion users.
 */
export function Skeleton({ className }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
      }}
    >
      {!reduceMotion && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--foreground) 9%, transparent), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
}
