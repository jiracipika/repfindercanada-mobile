import { motion, useReducedMotion } from "framer-motion";
import { Landmark } from "lucide-react";

export default function LoadingScreen() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="civic-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <div className="relative grid place-items-center">
        {/* Conic glow — static gradient, rotated via transform only */}
        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            className="absolute -inset-12 rounded-full opacity-45 blur-2xl"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 12%, var(--civic-red), var(--civic-blue), var(--civic-mint), transparent 88%)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, ease: "linear", repeat: Infinity }}
          />
        )}
        <motion.div
          className="civic-maple-mark relative"
          style={{ width: "5rem", height: "5rem", borderRadius: "1.5rem" }}
          animate={reduceMotion ? undefined : { y: [0, -7, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
        >
          <Landmark className="h-9 w-9" strokeWidth={2.2} />
        </motion.div>
      </div>
      <p className="mt-6 text-lg font-extrabold tracking-tight">RepFinder Canada</p>
      <p className="mt-1 text-sm text-muted-foreground">Preparing your civic map…</p>
    </div>
  );
}
