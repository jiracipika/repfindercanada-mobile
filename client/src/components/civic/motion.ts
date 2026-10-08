import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language for RepFinder Canada (iOS/HIG tuning).
 * One critically damped default spring — no overshoot anywhere.
 * Momentum gestures (pager drag release, future sheet drags) may use
 * the momentum spring with a small bounce. Entrance animations are a
 * single subtle fade + 8px rise.
 */

/** Default spring — critically damped, ~0.4s, no overshoot. */
export const springSoft: Transition = { type: "spring", bounce: 0, duration: 0.4 };
export const springSnappy: Transition = springSoft;
export const springPage: Transition = springSoft;

/** Momentum-driven gestures only (drag release). Bounce stays ≤ 0.2. */
export const springMomentum: Transition = { type: "spring", bounce: 0.2, duration: 0.4 };

/** Short cross-fade for selection/color/icon swaps (no movement). */
export const fadeTween: Transition = { duration: 0.15, ease: "easeOut" };

/** Entrance tween: 0.25s ease-out (iOS-style subtle arrival). */
export const entranceTween: Transition = { duration: 0.25, ease: "easeOut" };

/** Fade + 8px rise, for content blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: entranceTween },
};

/** Same entrance for dense list items (result cards, chips). */
export const fadeUpItem: Variants = fadeUp;

/**
 * Parent that staggers its `fadeUpItem` children. Capped at 0.03s/item;
 * only use for short groups (≤ 6 items) — lists animate as one surface.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

/** Directional page transition for the SwipePager (±24px slide + fade). */
export const pagerVariants: Variants = {
  enter: (direction: number) => ({ x: 24 * direction, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: -24 * direction, opacity: 0 }),
};

/** Icon swap — plain cross-fade (Sun/Moon, tab selection). No morph. */
export const iconSwap: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fadeTween },
  exit: { opacity: 0, transition: fadeTween },
};
