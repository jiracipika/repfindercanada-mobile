import { motion, useReducedMotion } from "framer-motion";
import { Landmark } from "lucide-react";

/**
 * iOS-style launch screen: one calm tinted mark that rises in and the
 * whole surface fades out quickly when startup completes. No glow ring,
 * no looping animation.
 */
export default function LoadingScreen() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="civic-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground"
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeOut" } }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        className="civic-maple-mark"
        style={{ width: "4.5rem", height: "4.5rem", borderRadius: "1.125rem" }}
        initial={reduceMotion ? undefined : { opacity: 0.1, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Landmark className="h-8 w-8" strokeWidth={1.8} />
      </motion.div>
      <p className="text-title3 mt-4 text-foreground">RepFinder Canada</p>
      <p className="text-subheadline mt-1 text-muted-foreground">Preparing your civic map…</p>
    </motion.div>
  );
}
