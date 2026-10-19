import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { registerBackDismiss } from "@/lib/native-shell";
import { springMomentum, springSoft } from "./motion";

interface BottomSheetProps {
  open: boolean;
  /** Radix contract — called with `false` for every dismiss path (drag, Esc, scrim). */
  onOpenChange: (open: boolean) => void;
  /**
   * Accessible name for the dialog. Rendered as a visually hidden
   * Radix DialogTitle so a11y semantics hold even when the visible
   * header is custom.
   */
  label: string;
  /** Header chrome (title row). Drag-to-dismiss also starts here on mobile. */
  header?: ReactNode;
  /** Scrollable body content. */
  children: ReactNode;
  /** Pinned footer (e.g. a save bar). */
  footer?: ReactNode;
  className?: string;
}

/** Dismiss when dragged past this offset (px) or flung faster than this (px/s). */
const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 500;

/**
 * iOS-style modal surface: bottom sheet on mobile (<768px) with a grabber
 * and drag-to-dismiss; centered modal card from 768px up. Radix Dialog
 * keeps focus trapping, Esc and aria semantics; framer-motion drives the
 * sheet physics. Dismissal animates out via AnimatePresence (short fade /
 * slide-down), entrance uses the critically damped default spring, and a
 * drag release hands off to the momentum spring (bounce 0.2 — the only
 * place a bounce is allowed).
 */
export function BottomSheet({
  open,
  onOpenChange,
  label,
  header,
  children,
  footer,
  className,
}: BottomSheetProps) {
  const isMobile = useIsMobile();
  const dragControls = useDragControls();
  const y = useMotionValue(0);

  // Android hardware back closes the top-most open sheet (LIFO) before the
  // app falls back to tab navigation / exit.
  useEffect(() => {
    if (!open) return;
    return registerBackDismiss(() => onOpenChange(false));
  }, [open, onOpenChange]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    dragControls.start(event);
  };

  const handleDragEnd = (
    _: unknown,
    info: { offset: { y: number }; velocity: { y: number } },
  ) => {
    if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
      // AnimatePresence exit continues from the current drag position.
      onOpenChange(false);
    } else {
      // Velocity handoff: release spring with the allowed small bounce.
      animate(y, 0, springMomentum);
    }
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <DialogPrimitive.Overlay key="sheet-overlay" asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>
          )}
        </AnimatePresence>

        {/* Positioner: bottom sheet below 768px, centered card above. No CSS
            transforms here — framer-motion owns the sheet's transform. */}
        <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <AnimatePresence>
            {open && (
              <DialogPrimitive.Content
                key="sheet-content"
                asChild
                forceMount
                aria-describedby={undefined}
                aria-label={label}
              >
                <motion.div
                  className={cn(
                    "pointer-events-auto flex w-full flex-col overflow-hidden bg-popover text-popover-foreground",
                    "max-h-[92dvh] rounded-t-[14px]",
                    "md:max-h-[86vh] md:max-w-[600px] md:rounded-[14px]",
                    "shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
                    className,
                  )}
                  style={isMobile ? { y } : undefined}
                  // opacity is pinned in EVERY branch (including mobile) so a
                  // mid-entrance isMobile flip can never cancel the fade to a
                  // sheet stuck invisible under a tap-eating overlay.
                  initial={isMobile ? { y: "100%", opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                  animate={isMobile ? { y: 0, opacity: 1, scale: 1, transition: springSoft } : { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } }}
                  exit={
                    isMobile
                      ? { y: "100%", opacity: 0, transition: { duration: 0.22, ease: "easeIn" } }
                      : { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18, ease: "easeIn" } }
                  }
                  drag={isMobile ? "y" : false}
                  dragListener={false}
                  dragControls={dragControls}
                  dragConstraints={{ top: 0 }}
                  dragElastic={0.2}
                  dragMomentum={false}
                  onDragEnd={isMobile ? handleDragEnd : undefined}
                >
                  <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>

                  {isMobile && (
                    <div
                      className="flex shrink-0 cursor-grab justify-center pb-[6px] pt-[6px]"
                      style={{ touchAction: "none" }}
                      onPointerDown={startDrag}
                    >
                      <span
                        aria-hidden="true"
                        className="h-[5px] w-9 rounded-full"
                        style={{ background: "var(--muted-foreground)" }}
                      />
                    </div>
                  )}

                  {header && (
                    <div
                      onPointerDown={startDrag}
                      className={cn("shrink-0", isMobile && "cursor-grab select-none")}
                      style={isMobile ? { touchAction: "none" } : undefined}
                    >
                      {header}
                    </div>
                  )}

                  <div
                    className="min-h-0 flex-1 overflow-y-auto"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {children}
                  </div>

                  {footer && <div className="shrink-0">{footer}</div>}
                </motion.div>
              </DialogPrimitive.Content>
            )}
          </AnimatePresence>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
