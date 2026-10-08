import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language for RepFinder Canada.
 * Springs live in the 300–380 stiffness / 28–34 damping band;
 * tweens stay inside 0.2–0.45s. Every variant animates
 * transform + opacity only.
 */

export const springSoft: Transition = { type: "spring", stiffness: 320, damping: 30 };
export const springSnappy: Transition = { type: "spring", stiffness: 380, damping: 32 };
export const springPage: Transition = { type: "spring", stiffness: 340, damping: 32 };

/** Tween used for symmetric enter/exit pairs where a spring would overshoot. */
export const fadeTween: Transition = { duration: 0.28, ease: "easeOut" };

/** Fade + rise, for list items and content blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Slightly tighter fade + rise for dense lists (result cards, chips). */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSoft },
};

/** Parent that staggers its `fadeUpItem` children. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
};

/** Directional page transition for the SwipePager (±24px slide + fade). */
export const pagerVariants: Variants = {
  enter: (direction: number) => ({ x: 24 * direction, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: -24 * direction, opacity: 0 }),
};

/** Icon swap (Sun/Moon morph, tab pops). */
export const iconSwap: Variants = {
  hidden: { opacity: 0, rotate: -90, scale: 0.6 },
  show: { opacity: 1, rotate: 0, scale: 1, transition: springSnappy },
  exit: { opacity: 0, rotate: 90, scale: 0.6, transition: fadeTween },
};
