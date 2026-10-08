import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Flat skeleton: muted fill at 12% alpha with a restrained foreground-6%
 * shimmer (1.4s). Framer-motion translate sweep, transform-only; static
 * tint for reduced-motion users. Non-interactive by construction.
 */
export function Skeleton({ className }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-xl", className)}
      style={{
        background: "color-mix(in srgb, var(--muted-foreground) 12%, transparent)",
      }}
    >
      {!reduceMotion && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--foreground) 6%, transparent), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
        />
      )}
    </div>
  );
}
