import { ReactNode, useEffect, useRef, useState } from "react";
import { animate, motion, PanInfo, useMotionValue, type ValueAnimationTransition } from "framer-motion";

/** Critically damped settle — identical to civic/motion.ts springPage, typed
 * for imperative animate() on a motion value (Transition ≠ ValueAnimationTransition). */
const settleSpring: ValueAnimationTransition<number> = { type: "spring", bounce: 0, duration: 0.4 };

interface SwipePagerProps {
  pages: ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

/** Fraction of the viewport a drag must cover to change pages. */
const PAGE_COMMIT_RATIO = 0.25;
/** px/s — a fling past this always turns the page (toward the fling). */
const FLING_VELOCITY = 450;

/**
 * iOS-style paging track: every page stays mounted, laid out side by side,
 * and the whole track follows the finger 1:1 while dragging. Release settles
 * the nearest page with the app's critically damped spring (no bounce, like
 * UIScrollView paging). Tab taps glide the same track, so taps and swipes
 * share one motion. Off-screen pages are aria-hidden and, while the track is
 * at rest, not painted; their scroll positions persist because nothing unmounts.
 */
export function SwipePager({ pages, currentIndex, onIndexChange, className = "" }: SwipePagerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [pageWidth, setPageWidth] = useState(0);
  const widthRef = useRef(0);
  const indexRef = useRef(currentIndex);
  /** False only while the track is moving, so every page it sweeps past is painted. */
  const [settled, setSettled] = useState(true);
  /** Identifies the latest glide, so an interrupted one cannot report "at rest". */
  const glideRef = useRef(0);

  const maxX = (pages.length - 1) * pageWidth;

  /** Glide to a page and mark the track at rest when the latest glide lands. */
  const glideTo = (index: number) => {
    setSettled(false);
    const glide = ++glideRef.current;
    const controls = animate(x, -index * widthRef.current, settleSpring);
    void controls.then(() => {
      if (glideRef.current === glide) setSettled(true);
    });
  };

  // Measure the viewport and realign the track instantly (first size,
  // rotation, any resize — never animate a resize).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w && w !== widthRef.current) {
        widthRef.current = w;
        setPageWidth(w);
        x.set(-indexRef.current * w);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [x]);

  // Tab taps / route changes glide to the target page. Drags commit through
  // the same helper, so indexRef already matches and this becomes a no-op.
  useEffect(() => {
    if (currentIndex !== indexRef.current) {
      indexRef.current = currentIndex;
      if (widthRef.current) glideTo(currentIndex);
    }
  }, [currentIndex, x]);

  const commit = (index: number) => {
    indexRef.current = index;
    glideTo(index);
    if (index !== currentIndex) onIndexChange(index);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    let target = indexRef.current;
    if (offset.x < -pageWidth * PAGE_COMMIT_RATIO || velocity.x < -FLING_VELOCITY) {
      target = Math.min(indexRef.current + 1, pages.length - 1);
    } else if (offset.x > pageWidth * PAGE_COMMIT_RATIO || velocity.x > FLING_VELOCITY) {
      target = Math.max(indexRef.current - 1, 0);
    }
    commit(target);
  };

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <motion.div
        className="flex h-full w-full"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -maxX, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        dragDirectionLock
        onDragStart={() => setSettled(false)}
        onDragEnd={handleDragEnd}
      >
        {pages.map((page, i) => (
          <div
            key={i}
            className="h-full w-full shrink-0 overflow-hidden"
            aria-hidden={i !== currentIndex}
            // Off-screen pages are hidden while the track is at rest: they are
            // not painted, and they leave the tab order — aria-hidden alone
            // kept their links and buttons focusable.
            style={{ visibility: settled && i !== currentIndex ? "hidden" : undefined }}
          >
            {page}
          </div>
        ))}
      </motion.div>

      {/* Accessibility announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Page ${currentIndex + 1} of ${pages.length}`}
      </div>
    </div>
  );
}
