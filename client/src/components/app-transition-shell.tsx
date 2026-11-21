import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

interface AppTransitionShellProps {
  /** Stable per-route key — a change remounts and replays the transition. */
  routeKey: string;
  children: ReactNode;
}

/**
 * Shared-axis entrance for screens that live outside the SwipePager
 * (sub-routes like Sources & Disclaimers). Forward: 12px rise + fade on
 * the standard 0.25s ease-out; exit is a quick 0.12s fade so the next
 * screen arrives immediately. Reduced motion: crossfade only — no travel.
 */
export function AppTransitionShell({ routeKey, children }: AppTransitionShellProps) {
  const reduceMotion = useReducedMotion();

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 };
  const show = { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } };
  const exit = { opacity: 0, transition: { duration: 0.12, ease: "easeIn" as const } };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={routeKey}
        initial={hidden}
        animate={show}
        exit={exit}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
