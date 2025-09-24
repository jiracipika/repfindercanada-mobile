import { motion } from "framer-motion";
import { Compass } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        <Compass className="h-24 w-24 text-primary" />
      </motion.div>
      <p className="text-neutral-600 mt-4">Finding your location...</p>
    </div>
  );
}
