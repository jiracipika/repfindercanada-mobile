import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type ValueAnimationTransition,
} from "framer-motion";
import { hapticLight } from "@/lib/native-shell";

/** Critically damped settle, typed for imperative animate() on a motion
 * value (Transition ≠ ValueAnimationTransition — same split as SwipePager). */
const settleSpring: ValueAnimationTransition<number> = { type: "spring", bounce: 0, duration: 0.4 };

interface PullToRefreshProps {
  /** Async refresh task; the indicator holds until it settles. */
  onRefresh: () => unknown;
  children: ReactNode;
  className?: string;
}

/** Pull distance (px, post-rubber-band) that commits a refresh. */
const TRIGGER = 56;
/** Post-commit resting distance (px) while the refresh runs. */
const HOLD = 40;
/** Pull distance at which the indicator starts fading in. */
const REVEAL = 10;
/** Rubber-band factor — 2:1 resistance on the raw gesture. */
const RESISTANCE = 0.5;

/**
 * Webview pull-to-refresh for the home scroller. Native-scroll aware:
 * engages only at scrollTop 0 with a predominantly vertical gesture, so
 * it never fights the horizontal SwipePager drag. Rubber-bands 2:1, ticks
 * a light haptic on commit, and honours reduced motion (functional pull,
 * no spring play).
 */
export function PullToRefresh({ onRefresh, children, className = "" }: PullToRefreshProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pull = useMotionValue(0);
  const [busy, setBusy] = useState(false);
  const reduceMotion = useReducedMotion();
  const gesture = useRef({ active: false, engaged: false, startY: 0, startX: 0, distance: 0 }).current;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onStart = (event: TouchEvent) => {
      if (busy || !event.touches.length) return;
      if (el.scrollTop > 0) return;
      gesture.active = true;
      gesture.engaged = false;
      gesture.startY = event.touches[0].clientY;
      gesture.startX = event.touches[0].clientX;
      gesture.distance = 0;
    };

    const onMove = (event: TouchEvent) => {
      if (!gesture.active || busy || !event.touches.length) return;
      const dy = event.touches[0].clientY - gesture.startY;
      const dx = event.touches[0].clientX - gesture.startX;

      if (!gesture.engaged) {
        // Direction lock: horizontal wins (SwipePager owns it); upward
        // travel or already-scrolled content cancels the pull.
        if (Math.abs(dx) > Math.abs(dy)) { gesture.active = false; return; }
        if (dy <= 4 || el.scrollTop > 0) return;
        gesture.engaged = true;
      }

      // We own the gesture now — keep the browser from scrolling too.
      event.preventDefault();
      gesture.distance = Math.min(Math.max(0, dy) * RESISTANCE, 120);
      pull.set(gesture.distance);
    };

    const onEnd = () => {
      if (!gesture.active) return;
      gesture.active = false;
      const committed = gesture.engaged && gesture.distance >= TRIGGER;
      const settle: ValueAnimationTransition<number> = reduceMotion
        ? { duration: 0.15, ease: "easeOut" }
        : settleSpring;
      if (!committed) {
        animate(pull, 0, settle);
        return;
      }
      hapticLight();
      setBusy(true);
      animate(pull, HOLD, settle);
      void Promise.resolve(onRefresh()).catch(() => {}).finally(() => {
        setBusy(false);
        const release: ValueAnimationTransition<number> = reduceMotion
          ? { duration: 0.2, ease: "easeOut" }
          : settleSpring;
        animate(pull, 0, release);
      });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [busy, onRefresh, pull, reduceMotion]);

  // Indicator rides the pull: hidden above the edge at rest, settled a
  // few px shy of the content top at TRIGGER, pinned at HOLD while busy.
  const indicatorY = useTransform(pull, (v) => -52 + (busy ? HOLD : v) * 0.72);
  const indicatorOpacity = useTransform(pull, [0, REVEAL], [0, 1]);
  const ringRotation = useTransform(pull, (v) => v * 2.6);

  return (
    <div className={`relative h-full ${className}`}>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center"
        style={{ y: indicatorY, opacity: indicatorOpacity }}
      >
        <motion.span className="civic-ptr-spinner" style={{ rotate: ringRotation }}>
          <span
            className="civic-ptr-ring block"
            style={{ animationPlayState: busy ? "running" : "paused" }}
          />
        </motion.span>
      </motion.div>

      <motion.div style={{ y: pull }} className="h-full">
        <div ref={scrollerRef} className="mobile-scroll h-full overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
