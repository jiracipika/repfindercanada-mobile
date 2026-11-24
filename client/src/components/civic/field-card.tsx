import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { fadeUp } from "./motion";

const SIZES = "(min-width: 760px) 728px, calc(100vw - 32px)";
const SRCSET = (ext: string) => `/hero/parliament-hill-640.${ext} 640w, /hero/parliament-hill-1024.${ext} 1024w`;
const ALT = "Parliament Hill overlooking the Ottawa River in autumn";

/**
 * The guide's editorial image in its arched frame, with the red note that
 * opens "Who handles what?". Shown on Find before the first search, where the
 * page used to spend the same space on an empty state that said nothing.
 *
 * The photo is the web sibling's hero image (same files). Its licence and
 * provenance are inherited with the project, not established here — see the
 * web repo's SKILL.md before reusing it in store listings.
 */
export function FieldCard({ onOpenGuide }: { onOpenGuide: () => void }) {
  return (
    <motion.figure variants={fadeUp} initial="hidden" animate="show" className="civic-field-card">
      <div className="civic-arch-frame">
        <picture>
          <source type="image/avif" srcSet={SRCSET("avif")} sizes={SIZES} />
          <source type="image/webp" srcSet={SRCSET("webp")} sizes={SIZES} />
          <img src="/hero/parliament-hill-1024.webp" alt={ALT} width={1024} height={680} decoding="async" />
        </picture>
      </div>

      <button type="button" className="civic-field-note" onClick={onOpenGuide}>
        <span>Who handles what?</span>
        <ArrowUpRight className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
      </button>

      <figcaption className="civic-field-caption">
        Parliament Hill, Ottawa
        <span className="mt-1 block text-pretty">
          Your postal code is used for this lookup and is not sent to an advertising or analytics
          service.
        </span>
      </figcaption>
    </motion.figure>
  );
}
