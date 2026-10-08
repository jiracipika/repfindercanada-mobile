import { motion, useReducedMotion } from "framer-motion";
import { Landmark } from "lucide-react";

export default function LoadingScreen() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="civic-shell flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground">
      <motion.div
        className="civic-maple-mark !h-20 !w-20 !rounded-3xl"
        animate={reduceMotion ? undefined : { y: [0, -7, 0], rotate: [0, -2, 0] }}
        transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
      >
        <Landmark className="h-9 w-9" strokeWidth={2.2} />
      </motion.div>
      <p className="mt-6 text-lg font-extrabold tracking-tight">RepFinder Canada</p>
      <p className="mt-1 text-sm text-muted-foreground">Preparing your civic map…</p>
    </div>
  );
}
