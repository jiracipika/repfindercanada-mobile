import { useState, useEffect, ReactNode, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useMotionValue, animate } from "framer-motion";

interface SwipePagerProps {
  pages: ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

const SWIPE_THRESHOLD = 50; // pixels - minimum distance to trigger page change
const VELOCITY_THRESHOLD = 500; // pixels per second - minimum velocity for fast swipe
const DRAG_START_THRESHOLD = 10; // pixels - minimum movement before considering it a drag

export function SwipePager({ pages, currentIndex, onIndexChange, className = "" }: SwipePagerProps) {
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [isDragIntentional, setIsDragIntentional] = useState(false);
  const dragStartPos = useRef(0);
  const lastIndexRef = useRef(currentIndex);

  // Reset position when index changes
  useEffect(() => {
    if (lastIndexRef.current !== currentIndex) {
      x.set(0);
      setIsDragIntentional(false);
      lastIndexRef.current = currentIndex;
    }
  }, [currentIndex, x]);

  const handleDragStart = (_: any, info: PanInfo) => {
    setDragging(true);
    setIsDragIntentional(false);
    dragStartPos.current = info.point.x;
  };

  const handleDrag = (_: any, info: PanInfo) => {
    const { offset, delta } = info;

    // Only start allowing drag movement once threshold is exceeded
    if (!isDragIntentional) {
      const totalDragDistance = Math.abs(offset.x);
      if (totalDragDistance > DRAG_START_THRESHOLD) {
        // Check if this is more horizontal than vertical
        if (Math.abs(offset.x) > Math.abs(offset.y) * 1.5) {
          setIsDragIntentional(true);
        }
      }
      // Don't allow movement until intentional drag is detected
      x.set(0);
      return;
    }

    // Ignore if mostly vertical scrolling
    if (Math.abs(delta.y) > Math.abs(delta.x) * 1.5) {
      return;
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipeDistance = offset.x;
    const swipeVelocity = velocity.x;

    // Reset drag states
    setDragging(false);
    setIsDragIntentional(false);

    // Determine if we should change pages (only if drag was intentional)
    let newIndex = currentIndex;

    if (isDragIntentional) {
      // Check velocity first for fast swipes
      if (Math.abs(swipeVelocity) > VELOCITY_THRESHOLD) {
        if (swipeVelocity > 0 && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (swipeVelocity < 0 && currentIndex < pages.length - 1) {
          newIndex = currentIndex + 1;
        }
      }
      // Then check distance for slower swipes
      else if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
        if (swipeDistance > 0 && currentIndex > 0) {
          newIndex = currentIndex - 1;
        } else if (swipeDistance < 0 && currentIndex < pages.length - 1) {
          newIndex = currentIndex + 1;
        }
      }
    }

    // Animate back to center
    animate(x, 0, {
      type: "spring",
      stiffness: 500,
      damping: 40,
      restDelta: 0.01
    });

    // Update index if changed
    if (newIndex !== currentIndex) {
      requestAnimationFrame(() => {
        onIndexChange(newIndex);
      });
    }
  };

  return (
    <div className={`relative w-full h-full touch-manipulation ${className}`} style={{ overflow: 'hidden' }}>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={isDragIntentional ? 0.1 : 0}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="w-full h-full"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full h-full"
          >
            {pages[currentIndex]}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Accessibility announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Page ${currentIndex + 1} of ${pages.length}`}
      </div>
    </div>
  );
}
