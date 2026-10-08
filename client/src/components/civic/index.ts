/**
 * Civic design-system primitives (token system 2.0).
 * Shared motion language, chips, states, skeletons and the rep card.
 */
export {
  springSoft,
  springSnappy,
  springPage,
  fadeTween,
  fadeUp,
  fadeUpItem,
  staggerContainer,
  pagerVariants,
  iconSwap,
} from "./motion";
export { PartyBadge, getPartyAccentClass, hasPartyAffiliation } from "./party-badge";
export { LevelChip, resolveLevel, type CivicLevel } from "./level-chip";
export { SectionHeader } from "./section-header";
export { EmptyState } from "./empty-state";
export { ErrorState } from "./error-state";
export { Skeleton } from "./skeleton";
export { RepCard, getPositionLabel, type RepresentativeCardProps } from "./rep-card";
